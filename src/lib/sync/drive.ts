/**
 * Google Drive API Client for Ledger Sync
 */

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

export interface DriveFile {
    id: string;
    name: string;
    modifiedTime: string;
    version: string;
}

class DriveClient {
    private gapiLoaded = false;
    private gisLoaded = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private tokenClient: any = null;

    async init(clientId: string) {
        if (this.gapiLoaded && this.gisLoaded) return;

        return new Promise<void>((resolve) => {
            const gapiScript = document.createElement('script');
            gapiScript.src = 'https://apis.google.com/js/api.js';
            gapiScript.onload = () => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (window as any).gapi.load('client', async () => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await (window as any).gapi.client.init({
                        discoveryDocs: [DISCOVERY_DOC],
                    });
                    this.gapiLoaded = true;
                    this.checkInit(resolve);
                });
            };
            document.body.appendChild(gapiScript);

            const gisScript = document.createElement('script');
            gisScript.src = 'https://accounts.google.com/gsi/client';
            gisScript.onload = () => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: SCOPES,
                    callback: '', // defined at request time
                });
                this.gisLoaded = true;
                this.checkInit(resolve);
            };
            document.body.appendChild(gisScript);
        });
    }

    private checkInit(resolve: () => void) {
        if (this.gapiLoaded && this.gisLoaded) resolve();
    }

    async authenticate(): Promise<string> {
        return new Promise((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.tokenClient.callback = (resp: any) => {
                if (resp.error !== undefined) {
                    reject(resp);
                }
                resolve(resp.access_token);
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((window as any).gapi.client.getToken() === null) {
                this.tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                this.tokenClient.requestAccessToken({ prompt: '' });
            }
        });
    }

    async findFile(name: string): Promise<DriveFile | null> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await (window as any).gapi.client.drive.files.list({
            q: `name = '${name}' and trashed = false`,
            fields: 'files(id, name, modifiedTime, version)',
        });
        const files = response.result.files;
        return files && files.length > 0 ? files[0] : null;
    }

    async uploadFile(name: string, content: string, fileId?: string) {
        const metadata = {
            name: name,
            mimeType: 'application/json',
        };

        if (fileId) {
            // Update existing
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return await (window as any).gapi.client.request({
                path: `/upload/drive/v3/files/${fileId}`,
                method: 'PATCH',
                params: { uploadType: 'multipart' },
                body: `--foo\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--foo\r\nContent-Type: text/plain\r\n\r\n${content}\r\n--foo--`,
            });
        } else {
            // Create new
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return await (window as any).gapi.client.request({
                path: '/upload/drive/v3/files',
                method: 'POST',
                params: { uploadType: 'multipart' },
                body: `--foo\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--foo\r\nContent-Type: text/plain\r\n\r\n${content}\r\n--foo--`,
            });
        }
    }

    async downloadFile(fileId: string): Promise<string> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await (window as any).gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media',
        });
        return response.body;
    }
}

export const driveClient = new DriveClient();
