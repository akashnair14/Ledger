/**
 * Utility to compress images on the client side before uploading / storing.
 * Reduces 10-30MB full-sensor camera captures to ~200-400KB to prevent
 * Android / iOS "Out of Memory" crashes and ensure fast sync.
 */
export async function compressImage(
    file: File,
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.8
): Promise<File> {
    if (!file || !file.type.startsWith('image/')) {
        return file;
    }

    // If file is already smaller than 250KB, no need to compress
    if (file.size < 250 * 1024) {
        return file;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Scale down maintaining aspect ratio
                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(file);
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (!blob || blob.size >= file.size) {
                            resolve(file);
                            return;
                        }

                        const compressedFile = new File(
                            [blob],
                            file.name.replace(/\.[^/.]+$/, '') + '.jpg',
                            {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            }
                        );
                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    quality
                );
            };

            img.onerror = () => resolve(file);
            img.src = e.target?.result as string;
        };

        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}
