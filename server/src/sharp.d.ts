declare module 'sharp' {
  type SharpPipeline = {
    metadata(): Promise<{ width?: number; height?: number }>;
    extract(options: { left: number; top: number; width: number; height: number }): SharpPipeline;
    toBuffer(): Promise<Buffer>;
  };

  const sharp: (input: Buffer) => SharpPipeline;
  export default sharp;
}
