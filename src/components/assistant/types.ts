/** An image selected in the composer but not yet uploaded. */
export interface PendingAttachment {
  id: string;
  file: File;
  /** Local object URL for preview only; the file is not uploadable until consent. */
  previewUrl: string;
}
