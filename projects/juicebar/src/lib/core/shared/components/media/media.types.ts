/** A text in one or more languages, e.g. `{en_GB: 'Image'}` */
export type PerLanguage = Record<string, string>;

/** A file's text detail: one text per language, or, as some records store it, one text */
export type MediaText = PerLanguage | string | null;

/** A file on a record, as `media.store` stored it */
export interface MediaFile {
  _id?: string;
  fileName?: string;
  mimeType?: string;
  fullPath?: string;
  thumbPath?: string;
  /** The media type's key */
  key?: string;
  /** The kind of file within the media type */
  type?: string;
  /** The media type's title */
  mediaType?: MediaText;
  name?: MediaText;
  description?: MediaText;
  title?: MediaText;
  alt_text?: MediaText;
}

/** A record whose files `app-media` lists */
export interface MediaRecord {
  media?: MediaFile[] | null;
}

/** A kind of file a media type takes, with the options the media service applies to it */
export interface MediaFileType {
  name: string;
  options?: {
    /** Shown in the add dialog when the type is picked */
    description?: PerLanguage;
    maxByteFileSize?: number;
  };
}

/** A media type of a collection, from the `media` configuration's `options.collections[].mediaTypes` */
export interface MediaType {
  key: string;
  name?: string;
  title: MediaText;
  types?: MediaFileType[];
}

/** The details the edit dialog changed, for the record's `updateMedia` */
export interface MediaDetails {
  key?: string;
  mediaType?: MediaText;
  name?: MediaText;
  description?: MediaText;
  title?: MediaText;
  alt_text?: MediaText;
}

/** What `app-media` emits when a file's details were edited */
export interface MediaUpdate {
  /** The file's `_id` */
  reference: string;
  data: MediaDetails;
}
