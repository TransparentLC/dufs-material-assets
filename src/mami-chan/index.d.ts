type DecodedString = InternalDecodedString;
declare class InternalDecodedString {
    _value: string;
    bytesReadCount: number;
    length: number;
    constructor(value: string, bytesReadCount: number);
    toString(): string;
}

type CallbackType = {
    onSuccess: (data: any) => void;
    onError?: (error: Object) => void;
};
type LoadCallbackType = {
    onSuccess: () => void;
    onError?: (error: Object) => void;
};
type CharsetType = "utf-16" | "utf-16le" | "utf-16be" | "utf-8" | "iso-8859-1";
type ByteRange = {
    offset: number;
    length: number;
};

interface IMediaFileReader<T = IMediaFileReaderInstance> {
    canReadFile(file: any): boolean;
    new (file: any): T;
}
interface IMediaFileReaderInstance {
    getSize(): number;
    getByteAt(offset: number): number;
    getBytesAt(offset: number, length: number): Array<number>;
    isBitSetAt(offset: number, bit: number): boolean;
    getSByteAt(offset: number): number;
    getShortAt(offset: number, isBigEndian: boolean): number;
    getSShortAt(offset: number, isBigEndian: boolean): number;
    getLongAt(offset: number, isBigEndian: boolean): number;
    getSLongAt(offset: number, isBigEndian: boolean): number;
    getInteger24At(offset: number, isBigEndian: boolean): number;
    getStringAt(offset: number, length: number): string;
    getStringWithCharsetAt(offset: number, length: number, charset?: CharsetType): DecodedString;
    getCharAt(offset: number): string;
    getSynchsafeInteger32At(offset: number): number;
    loadRange(range: [number, number], callbacks: LoadCallbackType): void;
    init(callbacks: LoadCallbackType): void;
    _isInitialized: boolean;
    _size: number;
    _init(callbacks: LoadCallbackType): void;
}
declare class MediaFileReader implements IMediaFileReaderInstance {
    _isInitialized: boolean;
    _size: number;
    constructor();
    /**
     * Decides if this media file reader is able to read the given file.
     */
    static canReadFile(file: any): boolean;
    /**
     * This function needs to be called before any other function.
     * Loads the necessary initial information from the file.
     */
    init(callbacks: LoadCallbackType): void;
    _init(callbacks: LoadCallbackType): void;
    /**
     * @param range The start and end indexes of the range to load.
     *        Ex: [0, 7] load bytes 0 to 7 inclusive.
     */
    loadRange(range: [number, number], callbacks: LoadCallbackType): void;
    /**
     * @return The size of the file in bytes.
     */
    getSize(): number;
    getByteAt(offset: number): number;
    getBytesAt(offset: number, length: number): Array<number>;
    isBitSetAt(offset: number, bit: number): boolean;
    getSByteAt(offset: number): number;
    getShortAt(offset: number, isBigEndian: boolean): number;
    getSShortAt(offset: number, isBigEndian: boolean): number;
    getLongAt(offset: number, isBigEndian: boolean): number;
    getSLongAt(offset: number, isBigEndian: boolean): number;
    getInteger24At(offset: number, isBigEndian: boolean): number;
    getStringAt(offset: number, length: number): string;
    getStringWithCharsetAt(offset: number, length: number, charset?: CharsetType): DecodedString;
    getCharAt(offset: number): string;
    /**
     * The ID3v2 tag/frame size is encoded with four bytes where the most
     * significant bit (bit 7) is set to zero in every byte, making a total of 28
     * bits. The zeroed bits are ignored, so a 257 bytes long tag is represented
     * as $00 00 02 01.
     */
    getSynchsafeInteger32At(offset: number): number;
}

interface IMediaTagReader<T = any> {
    new (mediaFileReader: IMediaFileReaderInstance): T;
    getTagIdentifierByteRange(): ByteRange;
    canReadTagFormat(tagIdentifier: Array<number>): boolean;
}

declare function read(location: Object, callbacks: CallbackType): void;
declare class Reader {
    _file: any;
    _tagsToRead: Array<string>;
    _fileReader: typeof MediaFileReader | undefined;
    _tagReader: typeof MediaFileReader | undefined;
    constructor(file: any);
    setTagsToRead(tagsToRead: Array<string>): Reader;
    setFileReader(fileReader: typeof MediaFileReader): Reader;
    setTagReader(tagReader: typeof MediaFileReader): Reader;
    read(callbacks: CallbackType): void;
    _getFileReader(): IMediaFileReader;
    _findFileReader(): IMediaFileReader;
    _getTagReader(fileReader: IMediaFileReaderInstance, callbacks: CallbackType): void;
    _findTagReader(fileReader: IMediaFileReaderInstance, callbacks: CallbackType): void;
    _loadTagIdentifierRanges(fileReader: IMediaFileReaderInstance, tagReaders: IMediaTagReader[], callbacks: LoadCallbackType): void;
}
declare class Config {
    static addFileReader(fileReader: IMediaFileReader): typeof Config;
    static addTagReader(tagReader: IMediaTagReader): typeof Config;
    static removeTagReader(tagReader: IMediaTagReader): typeof Config;
}
interface CommonMetadata {
    title?: string;
    artist?: string;
    album?: string;
    cover?: string;
}
declare function getCommonMetadata(url: string): Promise<CommonMetadata>;

export { type CommonMetadata, Config, Reader, getCommonMetadata, read };
