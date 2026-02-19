import sharp from 'sharp';

/**
 * Processes an avatar image by:
 * 1. Decoding it from a data URI
 * 2. Checking its dimensions
 * 3. If not square, zooming/cropping to the center to make it square
 * 4. Converting to a data URI
 *
 * @param avatarUrl - The avatar image as a data URI
 * @returns The processed avatar as a data URI
 */
export async function processAvatar(avatarUrl: string): Promise<string> {
  try {
    // Only accept data URIs to prevent SSRF attacks
    const dataUriMatch = avatarUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!dataUriMatch) {
      throw new Error('Avatar must be provided as a data URI');
    }

    const imageBuffer = Buffer.from(dataUriMatch[2], 'base64');

    // Get image metadata to check dimensions
    const metadata = await sharp(imageBuffer).metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Could not determine image dimensions');
    }

    let processedBuffer: Buffer;

    // If image is not square, crop it to the center to make it square
    if (metadata.width !== metadata.height) {
      const size = Math.min(metadata.width, metadata.height);
      const left = Math.floor((metadata.width - size) / 2);
      const top = Math.floor((metadata.height - size) / 2);

      processedBuffer = await sharp(imageBuffer)
        .extract({ left, top, width: size, height: size })
        .toBuffer();
    } else {
      processedBuffer = imageBuffer;
    }

    // Convert to data URI
    const base64 = processedBuffer.toString('base64');
    const dataUri = `data:image/png;base64,${base64}`;

    return dataUri;
  } catch (error) {
    throw new Error(
      `Avatar processing failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
