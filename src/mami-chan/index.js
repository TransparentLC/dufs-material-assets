// lib/ChunkedFileData.ts
var NOT_FOUND = -1;
var ChunkedFileData = class {
  static get NOT_FOUND() {
    return NOT_FOUND;
  }
  _fileData;
  constructor() {
    this._fileData = [];
  }
  /**
   * Adds data to the file storage at a specific offset.
   */
  addData(offset, data) {
    var offsetEnd = offset + data.length - 1;
    var chunkRange = this._getChunkRange(offset, offsetEnd);
    if (chunkRange.startIx === NOT_FOUND) {
      this._fileData.splice(chunkRange.insertIx || 0, 0, {
        offset,
        data
      });
    } else {
      var firstChunk = this._fileData[chunkRange.startIx];
      var lastChunk = this._fileData[chunkRange.endIx];
      var needsPrepend = offset > firstChunk.offset;
      var needsAppend = offsetEnd < lastChunk.offset + lastChunk.data.length - 1;
      var chunk = {
        offset: Math.min(offset, firstChunk.offset),
        data
      };
      if (needsPrepend) {
        var slicedData = this._sliceData(
          firstChunk.data,
          0,
          offset - firstChunk.offset
        );
        chunk.data = this._concatData(
          slicedData,
          data
        );
      }
      if (needsAppend) {
        var slicedData = this._sliceData(
          chunk.data,
          0,
          lastChunk.offset - chunk.offset
        );
        chunk.data = this._concatData(
          slicedData,
          lastChunk.data
        );
      }
      this._fileData.splice(
        chunkRange.startIx,
        chunkRange.endIx - chunkRange.startIx + 1,
        chunk
      );
    }
  }
  _concatData(dataA, dataB) {
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView && ArrayBuffer.isView(dataA)) {
      var dataAandB = new dataA.constructor(
        dataA.length + dataB.length
      );
      dataAandB.set(dataA, 0);
      dataAandB.set(dataB, dataA.length);
      return dataAandB;
    } else {
      return dataA.concat(dataB);
    }
  }
  _sliceData(data, begin, end) {
    if (data.slice) {
      return data.slice(begin, end);
    } else {
      return data.subarray(begin, end);
    }
  }
  /**
   * Finds the chunk range that overlaps the [offsetStart-1,offsetEnd+1] range.
   * When a chunk is adjacent to the offset we still consider it part of the
   * range (this is the situation of offsetStart-1 or offsetEnd+1).
   * When no chunks are found `insertIx` denotes the index where the data
   * should be inserted in the data list (startIx == NOT_FOUND and endIX ==
   * NOT_FOUND).
   */
  _getChunkRange(offsetStart, offsetEnd) {
    var startChunkIx = NOT_FOUND;
    var endChunkIx = NOT_FOUND;
    var insertIx = 0;
    for (var i = 0; i < this._fileData.length; i++, insertIx = i) {
      var chunkOffsetStart = this._fileData[i].offset;
      var chunkOffsetEnd = chunkOffsetStart + this._fileData[i].data.length;
      if (offsetEnd < chunkOffsetStart - 1) {
        break;
      }
      if (offsetStart <= chunkOffsetEnd + 1 && offsetEnd >= chunkOffsetStart - 1) {
        startChunkIx = i;
        break;
      }
    }
    if (startChunkIx === NOT_FOUND) {
      return {
        startIx: NOT_FOUND,
        endIx: NOT_FOUND,
        insertIx
      };
    }
    for (var i = startChunkIx; i < this._fileData.length; i++) {
      var chunkOffsetStart = this._fileData[i].offset;
      var chunkOffsetEnd = chunkOffsetStart + this._fileData[i].data.length;
      if (offsetEnd >= chunkOffsetStart - 1) {
        endChunkIx = i;
      }
      if (offsetEnd <= chunkOffsetEnd + 1) {
        break;
      }
    }
    if (endChunkIx === NOT_FOUND) {
      endChunkIx = startChunkIx;
    }
    return {
      startIx: startChunkIx,
      endIx: endChunkIx
    };
  }
  hasDataRange(offsetStart, offsetEnd) {
    for (var i = 0; i < this._fileData.length; i++) {
      var chunk = this._fileData[i];
      if (offsetEnd < chunk.offset) {
        return false;
      }
      if (offsetStart >= chunk.offset && offsetEnd < chunk.offset + chunk.data.length) {
        return true;
      }
    }
    return false;
  }
  getByteAt(offset) {
    var dataChunk;
    for (var i = 0; i < this._fileData.length; i++) {
      var dataChunkStart = this._fileData[i].offset;
      var dataChunkEnd = dataChunkStart + this._fileData[i].data.length - 1;
      if (offset >= dataChunkStart && offset <= dataChunkEnd) {
        dataChunk = this._fileData[i];
        break;
      }
    }
    if (dataChunk) {
      return dataChunk.data[offset - dataChunk.offset];
    }
    throw new Error("Offset " + offset + " hasn't been loaded yet.");
  }
};

// lib/StringUtils.ts
var InternalDecodedString = class {
  _value;
  bytesReadCount;
  length;
  constructor(value, bytesReadCount) {
    this._value = value;
    this.bytesReadCount = bytesReadCount;
    this.length = value.length;
  }
  toString() {
    return this._value;
  }
};
var utf8Decoder = new TextDecoder();
var utf16LEDecoder = new TextDecoder("utf-16");
var utf16BEDecoder = new TextDecoder("utf-16be");
function readUTF16String(bytes, bigEndian, maxBytes) {
  maxBytes = Math.min(maxBytes || bytes.length, bytes.length);
  return new InternalDecodedString((bigEndian ? utf16BEDecoder : utf16LEDecoder).decode(new Uint8Array(bytes.slice(0, maxBytes))), maxBytes);
}
function readUTF8String(bytes, maxBytes) {
  maxBytes = Math.min(maxBytes || bytes.length, bytes.length);
  return new InternalDecodedString(utf8Decoder.decode(new Uint8Array(bytes.slice(0, maxBytes))), maxBytes);
}
function readNullTerminatedString(bytes, maxBytes) {
  const arr = [];
  let i;
  maxBytes = maxBytes || bytes.length;
  for (i = 0; i < maxBytes; ) {
    const byte1 = bytes[i++];
    if (byte1 == 0) {
      break;
    }
    arr[i - 1] = String.fromCharCode(byte1);
  }
  return new InternalDecodedString(arr.join(""), i);
}

// lib/MediaFileReader.ts
var MediaFileReader = class {
  _isInitialized;
  _size;
  constructor() {
    this._isInitialized = false;
    this._size = 0;
  }
  /**
   * Decides if this media file reader is able to read the given file.
   */
  static canReadFile(file) {
    throw new Error("Must implement canReadFile function");
  }
  /**
   * This function needs to be called before any other function.
   * Loads the necessary initial information from the file.
   */
  init(callbacks) {
    var self = this;
    if (this._isInitialized) {
      setTimeout(callbacks.onSuccess, 1);
    } else {
      return this._init({
        onSuccess: function() {
          self._isInitialized = true;
          callbacks.onSuccess();
        },
        onError: callbacks.onError
      });
    }
  }
  _init(callbacks) {
    throw new Error("Must implement init function");
  }
  /**
   * @param range The start and end indexes of the range to load.
   *        Ex: [0, 7] load bytes 0 to 7 inclusive.
   */
  loadRange(range, callbacks) {
    throw new Error("Must implement loadRange function");
  }
  /**
   * @return The size of the file in bytes.
   */
  getSize() {
    if (!this._isInitialized) {
      throw new Error("init() must be called first.");
    }
    return this._size;
  }
  getByteAt(offset) {
    throw new Error("Must implement getByteAt function");
  }
  getBytesAt(offset, length) {
    var bytes = new Array(length);
    for (var i = 0; i < length; i++) {
      bytes[i] = this.getByteAt(offset + i);
    }
    return bytes;
  }
  isBitSetAt(offset, bit) {
    var iByte = this.getByteAt(offset);
    return (iByte & 1 << bit) != 0;
  }
  getSByteAt(offset) {
    var iByte = this.getByteAt(offset);
    if (iByte > 127) {
      return iByte - 256;
    } else {
      return iByte;
    }
  }
  getShortAt(offset, isBigEndian) {
    var iShort = isBigEndian ? this.getByteAt(offset) << 8 | this.getByteAt(offset + 1) : this.getByteAt(offset + 1) << 8 | this.getByteAt(offset);
    if (iShort < 0) {
      iShort += 65536;
    }
    return iShort;
  }
  getSShortAt(offset, isBigEndian) {
    var iUShort = this.getShortAt(offset, isBigEndian);
    if (iUShort > 32767) {
      return iUShort - 65536;
    } else {
      return iUShort;
    }
  }
  getLongAt(offset, isBigEndian) {
    var iByte1 = this.getByteAt(offset), iByte2 = this.getByteAt(offset + 1), iByte3 = this.getByteAt(offset + 2), iByte4 = this.getByteAt(offset + 3);
    var iLong = isBigEndian ? ((iByte1 << 8 | iByte2) << 8 | iByte3) << 8 | iByte4 : ((iByte4 << 8 | iByte3) << 8 | iByte2) << 8 | iByte1;
    if (iLong < 0) {
      iLong += 4294967296;
    }
    return iLong;
  }
  getSLongAt(offset, isBigEndian) {
    var iULong = this.getLongAt(offset, isBigEndian);
    if (iULong > 2147483647) {
      return iULong - 4294967296;
    } else {
      return iULong;
    }
  }
  getInteger24At(offset, isBigEndian) {
    var iByte1 = this.getByteAt(offset), iByte2 = this.getByteAt(offset + 1), iByte3 = this.getByteAt(offset + 2);
    var iInteger = isBigEndian ? (iByte1 << 8 | iByte2) << 8 | iByte3 : (iByte3 << 8 | iByte2) << 8 | iByte1;
    if (iInteger < 0) {
      iInteger += 16777216;
    }
    return iInteger;
  }
  getStringAt(offset, length) {
    var string = [];
    for (var i = offset, j = 0; i < offset + length; i++, j++) {
      string[j] = String.fromCharCode(this.getByteAt(i));
    }
    return string.join("");
  }
  getStringWithCharsetAt(offset, length, charset) {
    var bytes = this.getBytesAt(offset, length);
    var string;
    switch ((charset || "").toLowerCase()) {
      case "utf-16":
      case "utf-16le":
      case "utf-16be":
        string = readUTF16String(
          bytes,
          charset === "utf-16be"
        );
        break;
      case "utf-8":
        string = readUTF8String(bytes);
        break;
      default:
        string = readNullTerminatedString(bytes);
        break;
    }
    return string;
  }
  getCharAt(offset) {
    return String.fromCharCode(this.getByteAt(offset));
  }
  /**
   * The ID3v2 tag/frame size is encoded with four bytes where the most
   * significant bit (bit 7) is set to zero in every byte, making a total of 28
   * bits. The zeroed bits are ignored, so a 257 bytes long tag is represented
   * as $00 00 02 01.
   */
  getSynchsafeInteger32At(offset) {
    var size1 = this.getByteAt(offset);
    var size2 = this.getByteAt(offset + 1);
    var size3 = this.getByteAt(offset + 2);
    var size4 = this.getByteAt(offset + 3);
    var size = size4 & 127 | (size3 & 127) << 7 | (size2 & 127) << 14 | (size1 & 127) << 21;
    return size;
  }
};

// lib/FetchFileReader.ts
var CHUNK_SIZE = 1024;
var FetchFileReader = class extends MediaFileReader {
  _url;
  _fileData;
  static canReadFile(file) {
    return URL.canParse(file);
  }
  constructor(url) {
    super();
    this._url = url;
    this._fileData = new ChunkedFileData();
  }
  _init(callbacks) {
    fetch(this._url, {
      method: "HEAD"
    }).then((r) => {
      this._size = parseInt(r.headers.get("Content-Length"));
      callbacks.onSuccess();
    }).catch(callbacks.onError);
  }
  loadRange(range, callbacks) {
    if (this._fileData.hasDataRange(range[0], Math.min(this._size, range[1]))) {
      callbacks.onSuccess();
      return;
    }
    const requestRange = [range[0], Math.min(range[0] + Math.ceil((range[1] - range[0] + 1) / CHUNK_SIZE) * CHUNK_SIZE, this._size) - 1];
    fetch(this._url, {
      headers: {
        Range: `bytes=${requestRange[0]}-${requestRange[1]}`
      }
    }).then((r) => {
      if (r.status === 200 || r.status === 206) {
        return r.arrayBuffer();
      } else {
        throw new Error(`Unexpected HTTP status ${r.status}.`);
      }
    }).then((r) => {
      this._fileData.addData(requestRange[0], new Uint8Array(r));
      callbacks.onSuccess();
    }).catch(callbacks.onError);
  }
  getByteAt(offset) {
    return this._fileData.getByteAt(offset);
  }
};

// lib/MediaTagReader.ts
var MediaTagReader = class {
  _mediaFileReader;
  _tags;
  constructor(mediaFileReader) {
    this._mediaFileReader = mediaFileReader;
    this._tags = null;
  }
  /**
   * Returns the byte range that needs to be loaded and fed to
   * _canReadTagFormat in order to identify if the file contains tag
   * information that can be read.
   */
  static getTagIdentifierByteRange() {
    throw new Error("Must implement");
  }
  /**
   * Given a tag identifier (read from the file byte positions speficied by
   * getTagIdentifierByteRange) this function checks if it can read the tag
   * format or not.
   */
  static canReadTagFormat(tagIdentifier) {
    throw new Error("Must implement");
  }
  setTagsToRead(tags) {
    this._tags = tags;
    return this;
  }
  read(callbacks) {
    var self = this;
    this._mediaFileReader.init({
      onSuccess: function() {
        self._loadData(self._mediaFileReader, {
          onSuccess: function() {
            try {
              var tags = self._parseData(
                self._mediaFileReader,
                self._tags
              );
              callbacks.onSuccess(tags);
            } catch (ex) {
              if (callbacks.onError) {
                callbacks.onError({
                  type: "parseData",
                  info: ex.message
                });
                return;
              }
            }
          },
          onError: callbacks.onError
        });
      },
      onError: callbacks.onError
    });
  }
  getShortcuts() {
    return {};
  }
  /**
   * Load the necessary bytes from the media file.
   */
  _loadData(mediaFileReader, callbacks) {
    throw new Error("Must implement _loadData function");
  }
  /**
   * Parse the loaded data to read the media tags.
   */
  _parseData(mediaFileReader, tags) {
    throw new Error("Must implement _parseData function");
  }
  _expandShortcutTags(tagsWithShortcuts) {
    if (!tagsWithShortcuts) {
      return null;
    }
    var tags = [];
    var shortcuts = this.getShortcuts();
    for (var i = 0, tagOrShortcut; tagOrShortcut = tagsWithShortcuts[i]; i++) {
      tags = tags.concat(shortcuts[tagOrShortcut] || [tagOrShortcut]);
    }
    return tags;
  }
};

// lib/ID3v1TagReader.ts
var ID3v1TagReader = class extends MediaTagReader {
  static getTagIdentifierByteRange() {
    return {
      offset: -128,
      length: 128
    };
  }
  static canReadTagFormat(tagIdentifier) {
    var id = String.fromCharCode.apply(String, tagIdentifier.slice(0, 3));
    return id === "TAG";
  }
  _loadData(mediaFileReader, callbacks) {
    var fileSize = mediaFileReader.getSize();
    mediaFileReader.loadRange([fileSize - 128, fileSize - 1], callbacks);
  }
  _parseData(data, tags) {
    var offset = data.getSize() - 128;
    var title = data.getStringWithCharsetAt(offset + 3, 30).toString();
    var artist = data.getStringWithCharsetAt(offset + 33, 30).toString();
    var album = data.getStringWithCharsetAt(offset + 63, 30).toString();
    var year = data.getStringWithCharsetAt(offset + 93, 4).toString();
    var trackFlag = data.getByteAt(offset + 97 + 28);
    var track = data.getByteAt(offset + 97 + 29);
    if (trackFlag == 0 && track != 0) {
      var version = "1.1";
      var comment = data.getStringWithCharsetAt(offset + 97, 28).toString();
    } else {
      var version = "1.0";
      var comment = data.getStringWithCharsetAt(offset + 97, 30).toString();
      track = 0;
    }
    var genreIdx = data.getByteAt(offset + 97 + 30);
    if (genreIdx < 255) {
      var genre = GENRES[genreIdx];
    } else {
      var genre = "";
    }
    var tag = {
      type: "ID3",
      version,
      tags: {
        title,
        artist,
        album,
        year,
        comment,
        genre
      }
    };
    if (track) {
      tag.tags.track = track;
    }
    return tag;
  }
};
var GENRES = [
  "Blues",
  "Classic Rock",
  "Country",
  "Dance",
  "Disco",
  "Funk",
  "Grunge",
  "Hip-Hop",
  "Jazz",
  "Metal",
  "New Age",
  "Oldies",
  "Other",
  "Pop",
  "R&B",
  "Rap",
  "Reggae",
  "Rock",
  "Techno",
  "Industrial",
  "Alternative",
  "Ska",
  "Death Metal",
  "Pranks",
  "Soundtrack",
  "Euro-Techno",
  "Ambient",
  "Trip-Hop",
  "Vocal",
  "Jazz+Funk",
  "Fusion",
  "Trance",
  "Classical",
  "Instrumental",
  "Acid",
  "House",
  "Game",
  "Sound Clip",
  "Gospel",
  "Noise",
  "AlternRock",
  "Bass",
  "Soul",
  "Punk",
  "Space",
  "Meditative",
  "Instrumental Pop",
  "Instrumental Rock",
  "Ethnic",
  "Gothic",
  "Darkwave",
  "Techno-Industrial",
  "Electronic",
  "Pop-Folk",
  "Eurodance",
  "Dream",
  "Southern Rock",
  "Comedy",
  "Cult",
  "Gangsta",
  "Top 40",
  "Christian Rap",
  "Pop/Funk",
  "Jungle",
  "Native American",
  "Cabaret",
  "New Wave",
  "Psychadelic",
  "Rave",
  "Showtunes",
  "Trailer",
  "Lo-Fi",
  "Tribal",
  "Acid Punk",
  "Acid Jazz",
  "Polka",
  "Retro",
  "Musical",
  "Rock & Roll",
  "Hard Rock",
  "Folk",
  "Folk-Rock",
  "National Folk",
  "Swing",
  "Fast Fusion",
  "Bebob",
  "Latin",
  "Revival",
  "Celtic",
  "Bluegrass",
  "Avantgarde",
  "Gothic Rock",
  "Progressive Rock",
  "Psychedelic Rock",
  "Symphonic Rock",
  "Slow Rock",
  "Big Band",
  "Chorus",
  "Easy Listening",
  "Acoustic",
  "Humour",
  "Speech",
  "Chanson",
  "Opera",
  "Chamber Music",
  "Sonata",
  "Symphony",
  "Booty Bass",
  "Primus",
  "Porn Groove",
  "Satire",
  "Slow Jam",
  "Club",
  "Tango",
  "Samba",
  "Folklore",
  "Ballad",
  "Power Ballad",
  "Rhythmic Soul",
  "Freestyle",
  "Duet",
  "Punk Rock",
  "Drum Solo",
  "Acapella",
  "Euro-House",
  "Dance Hall"
];

// lib/ArrayFileReader.ts
var ArrayFileReader = class extends MediaFileReader {
  _array;
  _size;
  constructor(array) {
    super();
    this._array = array;
    this._size = array.length;
    this._isInitialized = true;
  }
  static canReadFile(file) {
    return Array.isArray(file);
  }
  init(callbacks) {
    setTimeout(callbacks.onSuccess, 0);
  }
  loadRange(range, callbacks) {
    setTimeout(callbacks.onSuccess, 0);
  }
  getByteAt(offset) {
    if (offset >= this._array.length) {
      throw new Error("Offset " + offset + " hasn't been loaded yet.");
    }
    return this._array[offset];
  }
};

// lib/ID3v2FrameReader.ts
var TEXT_FRAME_DESCRIPTIONS = {
  TAL: "Album/Movie/Show title",
  TBP: "BPM (Beats Per Minute)",
  TCM: "Composer",
  TCO: "Content type",
  TCR: "Copyright message",
  TDA: "Date",
  TDY: "Playlist delay",
  TEN: "Encoded by",
  TFT: "File type",
  TIM: "Time",
  TKE: "Initial key",
  TLA: "Language(s)",
  TLE: "Length",
  TMT: "Media type",
  TOA: "Original artist(s)/performer(s)",
  TOF: "Original filename",
  TOL: "Original Lyricist(s)/text writer(s)",
  TOR: "Original release year",
  TOT: "Original album/Movie/Show title",
  TP1: "Lead artist(s)/Lead performer(s)/Soloist(s)/Performing group",
  TP2: "Band/Orchestra/Accompaniment",
  TP3: "Conductor/Performer refinement",
  TP4: "Interpreted, remixed, or otherwise modified by",
  TPA: "Part of a set",
  TPB: "Publisher",
  TRC: "ISRC (International Standard Recording Code)",
  TRD: "Recording dates",
  TRK: "Track number/Position in set",
  TSI: "Size",
  TSS: "Software/hardware and settings used for encoding",
  TT1: "Content group description",
  TT2: "Title/Songname/Content description",
  TT3: "Subtitle/Description refinement",
  TXT: "Lyricist/text writer",
  TXX: "User defined text information frame",
  TYE: "Year",
  TALB: "Album/Movie/Show title",
  TBPM: "BPM (beats per minute)",
  TCOM: "Composer",
  TCON: "Content type",
  TCOP: "Copyright message",
  TDAT: "Date",
  TDLY: "Playlist delay",
  TDRC: "Recording time",
  TDRL: "Release time",
  TDTG: "Tagging time",
  TENC: "Encoded by",
  TEXT: "Lyricist/Text writer",
  TFLT: "File type",
  TIME: "Time",
  TIPL: "Involved people list",
  TIT1: "Content group description",
  TIT2: "Title/songname/content description",
  TIT3: "Subtitle/Description refinement",
  TKEY: "Initial key",
  TLAN: "Language(s)",
  TLEN: "Length",
  TMCL: "Musician credits list",
  TMED: "Media type",
  TMOO: "Mood",
  TOAL: "Original album/movie/show title",
  TOFN: "Original filename",
  TOLY: "Original lyricist(s)/text writer(s)",
  TOPE: "Original artist(s)/performer(s)",
  TORY: "Original release year",
  TOWN: "File owner/licensee",
  TPE1: "Lead performer(s)/Soloist(s)",
  TPE2: "Band/orchestra/accompaniment",
  TPE3: "Conductor/performer refinement",
  TPE4: "Interpreted, remixed, or otherwise modified by",
  TPOS: "Part of a set",
  TPRO: "Produced notice",
  TPUB: "Publisher",
  TRCK: "Track number/Position in set",
  TRDA: "Recording dates",
  TRSN: "Internet radio station name",
  TRSO: "Internet radio station owner",
  TSOA: "Album sort order",
  TSOP: "Performer sort order",
  TSOT: "Title sort order",
  TSIZ: "Size",
  TSRC: "ISRC (international standard recording code)",
  TSSE: "Software/Hardware and settings used for encoding",
  TSST: "Set subtitle",
  TYER: "Year",
  TXXX: "User defined text information frame"
};
var URL_FRAME_DESCRIPTIONS = {
  WAF: "Official audio file webpage",
  WAR: "Official artist/performer webpage",
  WAS: "Official audio source webpage",
  WCM: "Commercial information",
  WCP: "Copyright/Legal information",
  WPB: "Publishers official webpage",
  WXX: "User defined URL link frame",
  WCOM: "Commercial information",
  WCOP: "Copyright/Legal information",
  WOAF: "Official audio file webpage",
  WOAR: "Official artist/performer webpage",
  WOAS: "Official audio source webpage",
  WORS: "Official internet radio station homepage",
  WPAY: "Payment",
  WPUB: "Publishers official webpage",
  WXXX: "User defined URL link frame"
};
var _FRAME_DESCRIPTIONS = {
  // v2.2
  BUF: "Recommended buffer size",
  CNT: "Play counter",
  COM: "Comments",
  CRA: "Audio encryption",
  CRM: "Encrypted meta frame",
  ETC: "Event timing codes",
  EQU: "Equalization",
  GEO: "General encapsulated object",
  IPL: "Involved people list",
  LNK: "Linked information",
  MCI: "Music CD Identifier",
  MLL: "MPEG location lookup table",
  PIC: "Attached picture",
  POP: "Popularimeter",
  REV: "Reverb",
  RVA: "Relative volume adjustment",
  SLT: "Synchronized lyric/text",
  STC: "Synced tempo codes",
  UFI: "Unique file identifier",
  ULT: "Unsychronized lyric/text transcription",
  // v2.3
  AENC: "Audio encryption",
  APIC: "Attached picture",
  ASPI: "Audio seek point index",
  CHAP: "Chapter",
  CTOC: "Table of contents",
  COMM: "Comments",
  COMR: "Commercial frame",
  ENCR: "Encryption method registration",
  EQU2: "Equalisation (2)",
  EQUA: "Equalization",
  ETCO: "Event timing codes",
  GEOB: "General encapsulated object",
  GRID: "Group identification registration",
  IPLS: "Involved people list",
  LINK: "Linked information",
  MCDI: "Music CD identifier",
  MLLT: "MPEG location lookup table",
  OWNE: "Ownership frame",
  PRIV: "Private frame",
  PCNT: "Play counter",
  POPM: "Popularimeter",
  POSS: "Position synchronisation frame",
  RBUF: "Recommended buffer size",
  RVA2: "Relative volume adjustment (2)",
  RVAD: "Relative volume adjustment",
  RVRB: "Reverb",
  SEEK: "Seek frame",
  SYLT: "Synchronized lyric/text",
  SYTC: "Synchronized tempo codes",
  UFID: "Unique file identifier",
  USER: "Terms of use",
  USLT: "Unsychronized lyric/text transcription"
};
var FRAME_DESCRIPTIONS = {
  ...TEXT_FRAME_DESCRIPTIONS,
  ...URL_FRAME_DESCRIPTIONS,
  ..._FRAME_DESCRIPTIONS
};
var ID3v2FrameReader = class _ID3v2FrameReader {
  static getFrameReaderFunction(frameId) {
    if (frameId in frameReaderFunctions) {
      return allFrameReaderFunctions[frameId] ?? null;
    } else if (frameId.startsWith("T")) {
      return readTextFrame;
    } else if (frameId.startsWith("W")) {
      readUrlFrame;
    }
    return null;
  }
  /**
   * All the frames consists of a frame header followed by one or more fields
   * containing the actual information.
   * The frame ID made out of the characters capital A-Z and 0-9. Identifiers
   * beginning with "X", "Y" and "Z" are for experimental use and free for
   * everyone to use, without the need to set the experimental bit in the tag
   * header. Have in mind that someone else might have used the same identifier
   * as you. All other identifiers are either used or reserved for future use.
   * The frame ID is followed by a size descriptor, making a total header size
   * of ten bytes in every frame. The size is calculated as frame size excluding
   * frame header (frame size - 10).
   */
  static readFrames(offset, end, data, id3header, tags) {
    var frames = {};
    var frameHeaderSize = this._getFrameHeaderSize(id3header);
    while (
      // we should be able to read at least the frame header
      offset < end - frameHeaderSize
    ) {
      var header = this._readFrameHeader(data, offset, id3header);
      var frameId = header.id;
      if (!frameId) {
        break;
      }
      var flags = header.flags;
      var frameSize = header.size;
      var frameDataOffset = offset + header.headerSize;
      var frameData = data;
      offset += header.headerSize + header.size;
      if (tags && tags.indexOf(frameId) === -1) {
        continue;
      }
      if (frameId === "MP3e" || frameId === "\0MP3" || frameId === "\0\0MP" || frameId === " MP3") {
        break;
      }
      var unsyncData;
      if (flags && flags.format.unsynchronisation && !id3header.flags.unsynchronisation) {
        frameData = this.getUnsyncFileReader(
          frameData,
          frameDataOffset,
          frameSize
        );
        frameDataOffset = 0;
        frameSize = frameData.getSize();
      }
      if (flags && flags.format.data_length_indicator) {
        frameDataOffset += 4;
        frameSize -= 4;
      }
      var readFrameFunc = _ID3v2FrameReader.getFrameReaderFunction(
        frameId
      );
      var parsedData = readFrameFunc ? readFrameFunc.apply(this, [
        frameDataOffset,
        frameSize,
        frameData,
        flags,
        id3header
      ]) : null;
      var desc = this._getFrameDescription(frameId);
      var frame = {
        id: frameId,
        size: frameSize,
        description: desc,
        data: parsedData
      };
      let sframeId = frameId;
      if (frameId in frames) {
        if (frames[frameId].id) {
          frames[sframeId] = [frames[sframeId]];
        }
        frames[sframeId].push(frame);
      } else {
        frames[sframeId] = frame;
      }
    }
    return frames;
  }
  static _getFrameHeaderSize(id3header) {
    var major = id3header.major;
    if (major == 2) {
      return 6;
    } else if (major == 3 || major == 4) {
      return 10;
    } else {
      return 0;
    }
  }
  static _readFrameHeader(data, offset, id3header) {
    var major = id3header.major;
    var flags = null;
    var frameHeaderSize = this._getFrameHeaderSize(id3header);
    let frameId = "";
    let frameSize = 0;
    switch (major) {
      case 2:
        frameId = data.getStringAt(offset, 3);
        frameSize = data.getInteger24At(offset + 3, true);
        break;
      case 3:
        frameId = data.getStringAt(offset, 4);
        frameSize = data.getLongAt(offset + 4, true);
        break;
      case 4:
        frameId = data.getStringAt(offset, 4);
        frameSize = data.getSynchsafeInteger32At(offset + 4);
        break;
    }
    if (frameId == String.fromCharCode(0, 0, 0) || frameId == String.fromCharCode(0, 0, 0, 0)) {
      frameId = "";
    }
    if (frameId) {
      if (major > 2) {
        flags = this._readFrameFlags(data, offset + 8);
      }
    }
    return {
      id: frameId || "",
      size: frameSize,
      headerSize: frameHeaderSize || 0,
      flags
    };
  }
  static _readFrameFlags(data, offset) {
    return {
      message: {
        tag_alter_preservation: data.isBitSetAt(offset, 6),
        file_alter_preservation: data.isBitSetAt(offset, 5),
        read_only: data.isBitSetAt(offset, 4)
      },
      format: {
        grouping_identity: data.isBitSetAt(offset + 1, 7),
        compression: data.isBitSetAt(offset + 1, 3),
        encryption: data.isBitSetAt(offset + 1, 2),
        unsynchronisation: data.isBitSetAt(offset + 1, 1),
        data_length_indicator: data.isBitSetAt(offset + 1, 0)
      }
    };
  }
  static _getFrameDescription(frameId) {
    if (frameId in FRAME_DESCRIPTIONS) {
      return FRAME_DESCRIPTIONS[frameId];
    } else {
      return "Unknown";
    }
  }
  static getUnsyncFileReader(data, offset, size) {
    var frameData = data.getBytesAt(offset, size);
    for (var i = 0; i < frameData.length - 1; i++) {
      if (frameData[i] === 255 && frameData[i + 1] === 0) {
        frameData.splice(i + 1, 1);
      }
    }
    return new ArrayFileReader(frameData);
  }
};
var frameReaderFunctions = {
  APIC: readPictureFrame,
  PIC: readPictureFrame,
  CHAP: readChapterFrame,
  CTOC: readTableOfContentsFrame,
  COMM: readCommentsFrame,
  COM: readCommentsFrame,
  PCNT: readCounterFrame,
  CNT: readCounterFrame,
  ULT: readLyricsFrame,
  USLT: readLyricsFrame,
  // UFI: readFileIdentifierFrame, ??
  UFID: readFileIdentifierFrame
};
var textFrameReaderFunctions = {
  TCO: readGenreFrame,
  TCON: readGenreFrame,
  TXXX: readUserDefinedTextFrame
};
var urlFrameReaderFunctions = {
  WXXX: readUserDefinedUrlFrame
};
var allFrameReaderFunctions = {
  ...frameReaderFunctions,
  ...textFrameReaderFunctions,
  ...urlFrameReaderFunctions
};
var PICTURE_TYPE = [
  "Other",
  "32x32 pixels 'file icon' (PNG only)",
  "Other file icon",
  "Cover (front)",
  "Cover (back)",
  "Leaflet page",
  "Media (e.g. label side of CD)",
  "Lead artist/lead performer/soloist",
  "Artist/performer",
  "Conductor",
  "Band/Orchestra",
  "Composer",
  "Lyricist/text writer",
  "Recording Location",
  "During recording",
  "During performance",
  "Movie/video screen capture",
  "A bright coloured fish",
  "Illustration",
  "Band/artist logotype",
  "Publisher/Studio logotype"
];
function readPictureFrame(offset, length, data, flags, id3header) {
  let start = offset;
  let charset = getTextEncoding(data.getByteAt(offset));
  let format;
  switch (id3header && id3header.major) {
    case 2:
      format = data.getStringAt(offset + 1, 3);
      offset += 4;
      break;
    case 3:
    case 4:
      format = data.getStringWithCharsetAt(offset + 1, length - 1);
      offset += 1 + format.bytesReadCount;
      break;
    default:
      throw new Error("Couldn't read ID3v2 major version.");
  }
  let bite = data.getByteAt(offset);
  let type = PICTURE_TYPE[bite];
  let desc = data.getStringWithCharsetAt(
    offset + 1,
    length - (offset - start) - 1,
    charset
  );
  offset += 1 + desc.bytesReadCount;
  return {
    format: format.toString(),
    type,
    description: desc.toString(),
    data: data.getBytesAt(offset, start + length - offset)
  };
}
function readChapterFrame(offset, length, data, flags, id3header) {
  let originalOffset = offset;
  let result = {};
  let id = readNullTerminatedString(
    data.getBytesAt(offset, length)
  );
  result.id = id.toString();
  offset += id.bytesReadCount;
  result.startTime = data.getLongAt(offset, true);
  offset += 4;
  result.endTime = data.getLongAt(offset, true);
  offset += 4;
  result.startOffset = data.getLongAt(offset, true);
  offset += 4;
  result.endOffset = data.getLongAt(offset, true);
  offset += 4;
  if (!id3header)
    return result;
  let remainingLength = length - (offset - originalOffset);
  result.subFrames = this.readFrames(
    offset,
    offset + remainingLength,
    data,
    id3header
  );
  return result;
}
function readTableOfContentsFrame(offset, length, data, flags, id3header) {
  let originalOffset = offset;
  let result = {
    childElementIds: [],
    id: void 0,
    topLevel: void 0,
    ordered: void 0,
    entryCount: void 0,
    subFrames: void 0
  };
  var id = readNullTerminatedString(
    data.getBytesAt(offset, length)
  );
  result.id = id.toString();
  offset += id.bytesReadCount;
  result.topLevel = data.isBitSetAt(offset, 1);
  result.ordered = data.isBitSetAt(offset, 0);
  offset++;
  result.entryCount = data.getByteAt(offset);
  offset++;
  for (var i = 0; i < result.entryCount; i++) {
    var childId = readNullTerminatedString(
      data.getBytesAt(offset, length - (offset - originalOffset))
    );
    result.childElementIds.push(childId.toString());
    offset += childId.bytesReadCount;
  }
  if (!id3header)
    return result;
  var remainingLength = length - (offset - originalOffset);
  result.subFrames = this.readFrames(
    offset,
    offset + remainingLength,
    data,
    id3header
  );
  return result;
}
function readCommentsFrame(offset, length, data, flags, id3header) {
  var start = offset;
  var charset = getTextEncoding(data.getByteAt(offset));
  var language = data.getStringAt(offset + 1, 3);
  var shortdesc = data.getStringWithCharsetAt(
    offset + 4,
    length - 4,
    charset
  );
  offset += 4 + shortdesc.bytesReadCount;
  var text = data.getStringWithCharsetAt(
    offset,
    start + length - offset,
    charset
  );
  return {
    language,
    short_description: shortdesc.toString(),
    text: text.toString()
  };
}
function readCounterFrame(offset, length, data, flags, id3header) {
  return data.getLongAt(offset, false);
}
function readTextFrame(offset, length, data, flags, id3header) {
  var charset = getTextEncoding(data.getByteAt(offset));
  return data.getStringWithCharsetAt(offset + 1, length - 1, charset).toString();
}
function readUserDefinedTextFrame(offset, length, data, flags, id3header) {
  var charset = getTextEncoding(data.getByteAt(offset));
  return getUserDefinedFields(offset, length, data, charset);
}
function readUserDefinedUrlFrame(offset, length, data, flags, id3header) {
  if (length === 0) {
    return null;
  }
  var charset = getTextEncoding(data.getByteAt(offset));
  return getUserDefinedFields(offset, length, data, charset);
}
function readUrlFrame(offset, length, data, flags, id3header) {
  if (length === 0) {
    return null;
  }
  return data.getStringWithCharsetAt(offset, length, "iso-8859-1").toString();
}
function readGenreFrame(offset, length, data, flags) {
  var text = readTextFrame.apply(this, [offset, length, data, flags]);
  return text.replace(/^\(\d+\)/, "");
}
function readLyricsFrame(offset, length, data, flags, id3header) {
  var start = offset;
  var charset = getTextEncoding(data.getByteAt(offset));
  var language = data.getStringAt(offset + 1, 3);
  var descriptor = data.getStringWithCharsetAt(
    offset + 4,
    length - 4,
    charset
  );
  offset += 4 + descriptor.bytesReadCount;
  var lyrics = data.getStringWithCharsetAt(
    offset,
    start + length - offset,
    charset
  );
  return {
    language,
    descriptor: descriptor.toString(),
    lyrics: lyrics.toString()
  };
}
function readFileIdentifierFrame(offset, length, data, flags, id3header) {
  var ownerIdentifier = readNullTerminatedString(
    data.getBytesAt(offset, length)
  );
  offset += ownerIdentifier.bytesReadCount;
  var identifier = data.getBytesAt(
    offset,
    length - ownerIdentifier.bytesReadCount
  );
  return {
    ownerIdentifier: ownerIdentifier.toString(),
    identifier
  };
}
function getTextEncoding(bite) {
  var charset;
  switch (bite) {
    case 0:
      charset = "iso-8859-1";
      break;
    case 1:
      charset = "utf-16";
      break;
    case 2:
      charset = "utf-16be";
      break;
    case 3:
      charset = "utf-8";
      break;
    default:
      charset = "iso-8859-1";
  }
  return charset;
}
function getUserDefinedFields(offset, length, data, charset) {
  var userDesc = data.getStringWithCharsetAt(offset + 1, length - 1, charset);
  var userDefinedData = data.getStringWithCharsetAt(
    offset + 1 + userDesc.bytesReadCount,
    length - 1 - userDesc.bytesReadCount,
    charset
  );
  return {
    user_description: userDesc.toString(),
    data: userDefinedData.toString()
  };
}

// lib/ID3v2TagReader.ts
var ID3_HEADER_SIZE = 10;
var ID3v2TagReader = class extends MediaTagReader {
  static getTagIdentifierByteRange() {
    return {
      offset: 0,
      length: ID3_HEADER_SIZE
    };
  }
  static canReadTagFormat(tagIdentifier) {
    var id = String.fromCharCode.apply(String, tagIdentifier.slice(0, 3));
    return id === "ID3";
  }
  _loadData(mediaFileReader, callbacks) {
    mediaFileReader.loadRange([6, 9], {
      onSuccess: function() {
        mediaFileReader.loadRange(
          // The tag size does not include the header size.
          [
            0,
            ID3_HEADER_SIZE + mediaFileReader.getSynchsafeInteger32At(6) - 1
          ],
          callbacks
        );
      },
      onError: callbacks.onError
    });
  }
  _parseData(data, tags) {
    var offset = 0;
    var major = data.getByteAt(offset + 3);
    if (major > 4) {
      return { type: "ID3", version: ">2.4", tags: {} };
    }
    var revision = data.getByteAt(offset + 4);
    var unsynch = data.isBitSetAt(offset + 5, 7);
    var xheader = data.isBitSetAt(offset + 5, 6);
    var xindicator = data.isBitSetAt(offset + 5, 5);
    var size = data.getSynchsafeInteger32At(offset + 6);
    offset += 10;
    if (xheader) {
      if (major === 4) {
        var xheadersize = data.getSynchsafeInteger32At(offset);
        offset += xheadersize;
      } else {
        var xheadersize = data.getLongAt(offset, true);
        offset += xheadersize + 4;
      }
    }
    var id3 = {
      type: "ID3",
      version: "2." + major + "." + revision,
      major,
      revision,
      flags: {
        unsynchronisation: unsynch,
        extended_header: xheader,
        experimental_indicator: xindicator,
        // TODO: footer_present
        footer_present: false
      },
      size,
      tags: {}
    };
    let expandedTags = null;
    if (tags) {
      expandedTags = this._expandShortcutTags(tags);
    }
    var offsetEnd = size + 10;
    if (id3.flags.unsynchronisation) {
      data = ID3v2FrameReader.getUnsyncFileReader(data, offset, size);
      offset = 0;
      offsetEnd = data.getSize();
    }
    var frames = ID3v2FrameReader.readFrames(
      offset,
      offsetEnd,
      data,
      id3,
      expandedTags
    );
    for (var name in SHORTCUTS)
      if (SHORTCUTS.hasOwnProperty(name)) {
        var frameData = this._getFrameData(
          frames,
          SHORTCUTS[name]
        );
        if (frameData) {
          id3.tags[name] = frameData;
        }
      }
    for (var frame in frames)
      if (frames.hasOwnProperty(frame)) {
        id3.tags[frame] = frames[frame];
      }
    return id3;
  }
  _getFrameData(frames, ids) {
    var frame;
    for (var i = 0, id; id = ids[i]; i++) {
      if (id in frames) {
        if (frames[id] instanceof Array) {
          if (!frames[id]?.[0])
            throw new Error(
              "WHO THE FUCK WROTE THIS!? AND WHY WAS FLOW OK WITH IT????"
            );
          frame = frames[id][0];
        } else {
          frame = frames[id];
        }
        return frame.data;
      }
    }
    return null;
  }
  getShortcuts() {
    return SHORTCUTS;
  }
};
var SHORTCUTS = {
  title: ["TIT2", "TT2"],
  artist: ["TPE1", "TP1"],
  album: ["TALB", "TAL"],
  year: ["TYER", "TYE"],
  comment: ["COMM", "COM"],
  track: ["TRCK", "TRK"],
  genre: ["TCON", "TCO"],
  picture: ["APIC", "PIC"],
  lyrics: ["USLT", "ULT"]
};

// lib/MP4TagReader.ts
var MP4TagReader = class extends MediaTagReader {
  static getTagIdentifierByteRange() {
    return {
      offset: 0,
      length: 16
    };
  }
  static canReadTagFormat(tagIdentifier) {
    var id = String.fromCharCode.apply(String, tagIdentifier.slice(4, 8));
    return id === "ftyp";
  }
  _loadData(mediaFileReader, callbacks) {
    var self = this;
    mediaFileReader.loadRange([0, 16], {
      onSuccess: function() {
        self._loadAtom(mediaFileReader, 0, "", callbacks);
      },
      onError: callbacks.onError
    });
  }
  _loadAtom(mediaFileReader, offset, parentAtomFullName, callbacks) {
    if (offset >= mediaFileReader.getSize()) {
      callbacks.onSuccess();
      return;
    }
    var self = this;
    var atomSize = mediaFileReader.getLongAt(offset, true);
    if (atomSize == 0 || isNaN(atomSize)) {
      callbacks.onSuccess();
      return;
    }
    var atomName = mediaFileReader.getStringAt(offset + 4, 4);
    if (this._isContainerAtom(atomName)) {
      if (atomName == "meta") {
        offset += 4;
      }
      var atomFullName = (parentAtomFullName ? parentAtomFullName + "." : "") + atomName;
      if (atomFullName === "moov.udta.meta.ilst") {
        mediaFileReader.loadRange(
          [offset, offset + atomSize],
          callbacks
        );
      } else {
        mediaFileReader.loadRange([offset + 8, offset + 8 + 8], {
          onSuccess: function() {
            self._loadAtom(
              mediaFileReader,
              offset + 8,
              atomFullName,
              callbacks
            );
          },
          onError: callbacks.onError
        });
      }
    } else {
      mediaFileReader.loadRange(
        [offset + atomSize, offset + atomSize + 8],
        {
          onSuccess: function() {
            self._loadAtom(
              mediaFileReader,
              offset + atomSize,
              parentAtomFullName,
              callbacks
            );
          },
          onError: callbacks.onError
        }
      );
    }
  }
  _isContainerAtom(atomName) {
    return ["moov", "udta", "meta", "ilst"].indexOf(atomName) >= 0;
  }
  _canReadAtom(atomName) {
    return atomName !== "----";
  }
  _parseData(data, tagsToRead) {
    var tags = {};
    tagsToRead = this._expandShortcutTags(tagsToRead);
    this._readAtom(tags, data, 0, data.getSize(), tagsToRead);
    for (var name in SHORTCUTS2)
      if (SHORTCUTS2.hasOwnProperty(name)) {
        var tag = tags[SHORTCUTS2[name]];
        if (tag) {
          if (name === "track") {
            tags[name] = tag.data.track;
          } else {
            tags[name] = tag.data;
          }
        }
      }
    return {
      type: "MP4",
      ftyp: data.getStringAt(8, 4),
      version: data.getLongAt(12, true).toString(),
      tags
    };
  }
  _readAtom(tags, data, offset, length, tagsToRead, parentAtomFullName, indent) {
    indent = indent === void 0 ? "" : indent + "  ";
    var seek = offset;
    while (seek < offset + length) {
      var atomSize = data.getLongAt(seek, true);
      if (atomSize == 0) {
        return;
      }
      var atomName = data.getStringAt(seek + 4, 4);
      if (this._isContainerAtom(atomName)) {
        if (atomName == "meta") {
          seek += 4;
        }
        var atomFullName = (parentAtomFullName ? parentAtomFullName + "." : "") + atomName;
        this._readAtom(
          tags,
          data,
          seek + 8,
          atomSize - 8,
          tagsToRead,
          atomFullName,
          indent
        );
        return;
      }
      if ((!tagsToRead || tagsToRead.indexOf(atomName) >= 0) && parentAtomFullName === "moov.udta.meta.ilst" && this._canReadAtom(atomName)) {
        tags[atomName] = this._readMetadataAtom(data, seek);
      }
      seek += atomSize;
    }
  }
  _readMetadataAtom(data, offset) {
    const METADATA_HEADER = 16;
    var atomSize = data.getLongAt(offset, true);
    var atomName = data.getStringAt(offset + 4, 4);
    var klass = data.getInteger24At(offset + METADATA_HEADER + 1, true);
    var type = TYPES[klass] ?? 0;
    var atomData;
    var bigEndian = true;
    if (atomName == "trkn") {
      atomData = {
        track: data.getShortAt(
          offset + METADATA_HEADER + 10,
          bigEndian
        ),
        total: data.getShortAt(
          offset + METADATA_HEADER + 14,
          bigEndian
        )
      };
    } else if (atomName == "disk") {
      atomData = {
        disk: data.getShortAt(offset + METADATA_HEADER + 10, bigEndian),
        total: data.getShortAt(
          offset + METADATA_HEADER + 14,
          bigEndian
        )
      };
    } else {
      var atomHeader = METADATA_HEADER + 4 + 4;
      var dataStart = offset + atomHeader;
      var dataLength = atomSize - atomHeader;
      var atomData;
      if (atomName === "covr" && type === "uint8") {
        type = "jpeg";
      }
      switch (type) {
        case "text":
          atomData = data.getStringWithCharsetAt(dataStart, dataLength, "utf-8").toString();
          break;
        case "uint8":
          atomData = data.getShortAt(dataStart, false);
          break;
        case "int":
        case "uint":
          var intReader = type == "int" ? dataLength == 1 ? data.getSByteAt : dataLength == 2 ? data.getSShortAt : dataLength == 4 ? data.getSLongAt : data.getLongAt : dataLength == 1 ? data.getByteAt : dataLength == 2 ? data.getShortAt : data.getLongAt;
          atomData = intReader.call(
            data,
            dataStart + (dataLength == 8 ? 4 : 0),
            true
          );
          break;
        case "jpeg":
        case "png":
          atomData = {
            format: "image/" + type,
            data: data.getBytesAt(dataStart, dataLength)
          };
          break;
      }
    }
    return {
      id: atomName,
      size: atomSize,
      description: ATOM_DESCRIPTIONS[atomName] || "Unknown",
      data: atomData
    };
  }
  getShortcuts() {
    return SHORTCUTS2;
  }
};
var TYPES = {
  0: "uint8",
  1: "text",
  13: "jpeg",
  14: "png",
  21: "int",
  22: "uint"
};
var ATOM_DESCRIPTIONS = {
  "\xA9alb": "Album",
  "\xA9ART": "Artist",
  aART: "Album Artist",
  "\xA9day": "Release Date",
  "\xA9nam": "Title",
  "\xA9gen": "Genre",
  gnre: "Genre",
  trkn: "Track Number",
  "\xA9wrt": "Composer",
  "\xA9too": "Encoding Tool",
  "\xA9enc": "Encoded By",
  cprt: "Copyright",
  covr: "Cover Art",
  "\xA9grp": "Grouping",
  keyw: "Keywords",
  "\xA9lyr": "Lyrics",
  "\xA9cmt": "Comment",
  tmpo: "Tempo",
  cpil: "Compilation",
  disk: "Disc Number",
  tvsh: "TV Show Name",
  tven: "TV Episode ID",
  tvsn: "TV Season",
  tves: "TV Episode",
  tvnn: "TV Network",
  desc: "Description",
  ldes: "Long Description",
  sonm: "Sort Name",
  soar: "Sort Artist",
  soaa: "Sort Album",
  soco: "Sort Composer",
  sosn: "Sort Show",
  purd: "Purchase Date",
  pcst: "Podcast",
  purl: "Podcast URL",
  catg: "Category",
  hdvd: "HD Video",
  stik: "Media Type",
  rtng: "Content Rating",
  pgap: "Gapless Playback",
  apID: "Purchase Account",
  sfID: "Country Code",
  atID: "Artist ID",
  cnID: "Catalog ID",
  plID: "Collection ID",
  geID: "Genre ID",
  "xid ": "Vendor Information",
  flvr: "Codec Flavor"
};
var SHORTCUTS2 = {
  title: "\xA9nam",
  artist: "\xA9ART",
  album: "\xA9alb",
  year: "\xA9day",
  comment: "\xA9cmt",
  track: "trkn",
  genre: "\xA9gen",
  picture: "covr",
  lyrics: "\xA9lyr"
};

// lib/FLACTagReader.ts
var FLAC_HEADER_SIZE = 4;
var COMMENT_HEADERS = [4, 132];
var PICTURE_HEADERS = [6, 134];
var IMAGE_TYPES = [
  "Other",
  "32x32 pixels 'file icon' (PNG only)",
  "Other file icon",
  "Cover (front)",
  "Cover (back)",
  "Leaflet page",
  "Media (e.g. label side of CD)",
  "Lead artist/lead performer/soloist",
  "Artist/performer",
  "Conductor",
  "Band/Orchestra",
  "Composer",
  "Lyricist/text writer",
  "Recording Location",
  "During recording",
  "During performance",
  "Movie/video screen capture",
  "A bright coloured fish",
  "Illustration",
  "Band/artist logotype",
  "Publisher/Studio logotype"
];
var FLACTagReader = class extends MediaTagReader {
  _commentOffset = 0;
  _pictureOffset = 0;
  /**
   * Gets the byte range for the tag identifier.
   *
   * Because the Vorbis comment block is not guaranteed to be in a specified
   * location, we can only load the first 4 bytes of the file to confirm it
   * is a FLAC first.
   *
   * @return {ByteRange} The byte range that identifies the tag for a FLAC.
   */
  static getTagIdentifierByteRange() {
    return {
      offset: 0,
      length: FLAC_HEADER_SIZE
    };
  }
  /**
   * Determines whether or not this reader can read a certain tag format.
   *
   * This checks that the first 4 characters in the file are fLaC, which
   * according to the FLAC file specification should be the characters that
   * indicate a FLAC file.
   *
   * @return {boolean} True if the header is fLaC, false otherwise.
   */
  static canReadTagFormat(tagIdentifier) {
    var id = String.fromCharCode.apply(String, tagIdentifier.slice(0, 4));
    return id === "fLaC";
  }
  /**
   * Function called to load the data from the file.
   *
   * To begin processing the blocks, the next 4 bytes after the initial 4 bytes
   * (bytes 4 through 7) are loaded. From there, the rest of the loading process
   * is passed on to the _loadBlock function, which will handle the rest of the
   * parsing for the metadata blocks.
   *
   * @param {MediaFileReader} mediaFileReader - The MediaFileReader used to parse the file.
   * @param {LoadCallbackType} callbacks - The callback to call once _loadData is completed.
   */
  _loadData(mediaFileReader, callbacks) {
    var self = this;
    mediaFileReader.loadRange([4, 7], {
      onSuccess: function() {
        self._loadBlock(mediaFileReader, 4, callbacks);
      }
    });
  }
  /**
   * Special internal function used to parse the different FLAC blocks.
   *
   * The FLAC specification doesn't specify a specific location for metadata to resign, but
   * dictates that it may be in one of various blocks located throughout the file. To load the
   * metadata, we must locate the header first. This can be done by reading the first byte of
   * each block to determine the block type. After the block type comes a 24 bit integer that stores
   * the length of the block as big endian. Using this, we locate the block and store the offset for
   * parsing later.
   *
   * After each block has been parsed, the _nextBlock function is called in order
   * to parse the information of the next block. All blocks need to be parsed in order to find
   * all of the picture and comment blocks.
   *
   * More info on the FLAC specification may be found here:
   * https://xiph.org/flac/format.html
   * @param {MediaFileReader} mediaFileReader - The MediaFileReader used to parse the file.
   * @param {number} offset - The offset to start checking the header from.
   * @param {LoadCallbackType} callbacks - The callback to call once the header has been found.
   */
  _loadBlock(mediaFileReader, offset, callbacks) {
    var self = this;
    var blockHeader = mediaFileReader.getByteAt(offset);
    var blockSize = mediaFileReader.getInteger24At(offset + 1, true);
    if (COMMENT_HEADERS.indexOf(blockHeader) !== -1) {
      var offsetMetadata = offset + 4;
      mediaFileReader.loadRange(
        [offsetMetadata, offsetMetadata + blockSize],
        {
          onSuccess: function() {
            self._commentOffset = offsetMetadata;
            self._nextBlock(
              mediaFileReader,
              offset,
              blockHeader,
              blockSize,
              callbacks
            );
          }
        }
      );
    } else if (PICTURE_HEADERS.indexOf(blockHeader) !== -1) {
      var offsetMetadata = offset + 4;
      mediaFileReader.loadRange(
        [offsetMetadata, offsetMetadata + blockSize],
        {
          onSuccess: function() {
            self._pictureOffset = offsetMetadata;
            self._nextBlock(
              mediaFileReader,
              offset,
              blockHeader,
              blockSize,
              callbacks
            );
          }
        }
      );
    } else {
      self._nextBlock(
        mediaFileReader,
        offset,
        blockHeader,
        blockSize,
        callbacks
      );
    }
  }
  /**
   * Internal function used to load the next range and respective block.
   *
   * If the metadata block that was identified is not the last block before the
   * audio blocks, the function will continue loading the next blocks. If it is
   * the last block (identified by any values greater than 127, see FLAC spec.),
   * the function will determine whether a comment block had been identified.
   *
   * If the block does not exist, the error callback is called. Otherwise, the function
   * will call the success callback, allowing data parsing to begin.
   * @param {MediaFileReader} mediaFileReader - The MediaFileReader used to parse the file.
   * @param {number} offset - The offset that the existing header was located at.
   * @param {number} blockHeader - An integer reflecting the header type of the block.
   * @param {number} blockSize - The size of the previously processed header.
   * @param {LoadCallbackType} callbacks - The callback functions to be called.
   */
  _nextBlock(mediaFileReader, offset, blockHeader, blockSize, callbacks) {
    var self = this;
    if (blockHeader > 127) {
      if (!self._commentOffset) {
        callbacks.onError?.({
          type: "loadData",
          info: "Comment block could not be found."
        });
      } else {
        callbacks.onSuccess();
      }
    } else {
      mediaFileReader.loadRange(
        [offset + 4 + blockSize, offset + 4 + 4 + blockSize],
        {
          onSuccess: function() {
            self._loadBlock(
              mediaFileReader,
              offset + 4 + blockSize,
              callbacks
            );
          }
        }
      );
    }
  }
  /**
   * Parses the data and returns the tags.
   *
   * This is an overview of the VorbisComment format and what this function attempts to
   * retrieve:
   * - First 4 bytes: a long that contains the length of the vendor string.
   * - Next n bytes: the vendor string encoded in UTF-8.
   * - Next 4 bytes: a long representing how many comments are in this block
   * For each comment that exists:
   * - First 4 bytes: a long representing the length of the comment
   * - Next n bytes: the comment encoded in UTF-8.
   * The comment string will usually appear in a format similar to:
   * ARTIST=me
   *
   * Note that the longs and integers in this block are encoded in little endian
   * as opposed to big endian for the rest of the FLAC spec.
   * @param {MediaFileReader} data - The MediaFileReader to parse the file with.
   * @param {Array<string>} [tags] - Optional tags to also be retrieved from the file.
   * @return {TagType} - An object containing the tag information for the file.
   */
  _parseData(data, tags) {
    var vendorLength = data.getLongAt(this._commentOffset, false);
    var offsetVendor = this._commentOffset + 4;
    var offsetList = vendorLength + offsetVendor;
    var numComments = data.getLongAt(offsetList, false);
    var dataOffset = offsetList + 4;
    var title, artist, album, track, genre, picture;
    for (let i = 0; i < numComments; i++) {
      let dataLength2 = data.getLongAt(dataOffset, false);
      let s = data.getStringWithCharsetAt(dataOffset + 4, dataLength2, "utf-8").toString();
      let d = s.indexOf("=");
      let split = [s.slice(0, d), s.slice(d + 1)];
      switch (split[0].toUpperCase()) {
        case "TITLE":
          title = split[1];
          break;
        case "ARTIST":
          artist = split[1];
          break;
        case "ALBUM":
          album = split[1];
          break;
        case "TRACKNUMBER":
          track = split[1];
          break;
        case "GENRE":
          genre = split[1];
          break;
      }
      dataOffset += 4 + dataLength2;
    }
    if (this._pictureOffset) {
      var imageType = data.getLongAt(this._pictureOffset, true);
      var offsetMimeLength = this._pictureOffset + 4;
      var mimeLength = data.getLongAt(offsetMimeLength, true);
      var offsetMime = offsetMimeLength + 4;
      var mime = data.getStringAt(offsetMime, mimeLength);
      var offsetDescriptionLength = offsetMime + mimeLength;
      var descriptionLength = data.getLongAt(
        offsetDescriptionLength,
        true
      );
      var offsetDescription = offsetDescriptionLength + 4;
      var description = data.getStringWithCharsetAt(
        offsetDescription,
        descriptionLength,
        "utf-8"
      ).toString();
      var offsetDataLength = offsetDescription + descriptionLength + 16;
      var dataLength = data.getLongAt(offsetDataLength, true);
      var offsetData = offsetDataLength + 4;
      var imageData = data.getBytesAt(offsetData, dataLength);
      picture = {
        format: mime,
        type: IMAGE_TYPES[imageType],
        description,
        data: imageData
      };
    }
    var tag = {
      type: "FLAC",
      version: "1",
      tags: {
        title,
        artist,
        album,
        track,
        genre,
        picture
      }
    };
    return tag;
  }
};

// lib/OggTagReader.ts
var utf8Decoder2 = new TextDecoder();
var getStringAt = (buffer, offset, length) => String.fromCharCode.apply(String, buffer.slice(offset, offset + length));
var getUTF8StringAt = (buffer, offset, length) => utf8Decoder2.decode(new Uint8Array(buffer.slice(offset, offset + length)));
var getLongLEAt = (buffer, offset) => buffer[offset++] | buffer[offset++] << 8 | buffer[offset++] << 16 | buffer[offset++] << 24;
var getLongBEAt = (buffer, offset) => buffer[offset++] << 24 | buffer[offset++] << 16 | buffer[offset++] << 8 | buffer[offset++];
var OggTagReader = class extends MediaTagReader {
  offset;
  packets;
  constructor(mediaFileReader) {
    super(mediaFileReader);
    this.offset = 0;
    this.packets = [];
  }
  static getTagIdentifierByteRange() {
    return {
      offset: 0,
      length: 4
    };
  }
  static canReadTagFormat(tagIdentifier) {
    return String.fromCharCode.apply(String, tagIdentifier.slice(0, 4)) === "OggS";
  }
  _loadData(mediaFileReader, callbacks) {
    (async () => {
      try {
        let freshPacket = true;
        while (true) {
          await new Promise((onSuccess, onError) => mediaFileReader.loadRange([this.offset, this.offset + 27 - 1], { onSuccess, onError }));
          const capturePattern = mediaFileReader.getStringAt(this.offset, 4);
          this.offset += 26;
          const pageSegments = mediaFileReader.getByteAt(this.offset);
          this.offset += 1;
          await new Promise((onSuccess, onError) => mediaFileReader.loadRange([this.offset, this.offset + pageSegments - 1], { onSuccess, onError }));
          const segmentTable = mediaFileReader.getBytesAt(this.offset, pageSegments);
          this.offset += pageSegments;
          if (capturePattern !== "OggS")
            throw new Error("Incorrect OGG page header");
          let packetLengthInPage = 0;
          for (let i = 0; i < segmentTable.length; i++) {
            if (freshPacket) {
              this.packets.push([]);
              freshPacket = false;
              packetLengthInPage = 0;
            }
            packetLengthInPage += segmentTable[i];
            if (segmentTable[i] < 255 || i === segmentTable.length - 1) {
              await new Promise((onSuccess, onError) => mediaFileReader.loadRange([this.offset, this.offset + packetLengthInPage - 1], { onSuccess, onError }));
              const packetData = mediaFileReader.getBytesAt(this.offset, packetLengthInPage);
              this.offset += packetLengthInPage;
              this.packets[this.packets.length - 1] = this.packets[this.packets.length - 1].concat(packetData);
              if ((freshPacket = segmentTable[i] < 255) && this.packets.length >= 2)
                return callbacks.onSuccess();
            }
          }
        }
      } catch (err) {
        callbacks.onError(err);
      }
    })();
  }
  _parseData(mediaFileReader, tags) {
    const result = {
      type: "",
      tags: {
        // title
        // artist
        // album
        // year
        // comment
        // track
        // genre
        // picture
        // lyrics
      }
    };
    const packet = this.packets[1];
    let offset;
    if (packet[0] === 3 && getStringAt(packet, 1, 6) === "vorbis") {
      result.type = "Vorbis";
      offset = 7;
    } else if (getStringAt(packet, 0, 8) === "OpusTags") {
      result.type = "Opus";
      offset = 8;
    } else {
      throw new Error("Unknown packet data");
    }
    const vendorLength = getLongLEAt(packet, offset);
    offset += 4 + vendorLength;
    const userCommentListLength = getLongLEAt(packet, offset);
    offset += 4;
    for (let i = 0; i < userCommentListLength; i++) {
      const userCommentLength = getLongLEAt(packet, offset);
      offset += 4;
      const userComment = getUTF8StringAt(packet, offset, userCommentLength);
      offset += userCommentLength;
      let [id, data] = userComment.split("=", 2);
      id = id.toUpperCase();
      switch (id) {
        case "TITLE":
        case "ARTIST":
        case "ALBUM":
        case "GENRE":
          result.tags[id.toLowerCase()] = data;
          break;
        case "DATE":
        case "TRACKNUMBER":
          result.tags[{
            DATE: "year",
            TRACKNUMBER: "track"
          }[id]] = data;
          break;
        case "METADATA_BLOCK_PICTURE":
          const isNode = typeof process !== "undefined" && process?.versions?.node;
          const pictureData = isNode ? Array.from(Buffer.from(data, "base64")) : atob(data).split("").map((e) => e.charCodeAt(0));
          let offset2 = 0;
          const type = getLongBEAt(pictureData, offset2);
          offset2 += 4;
          const mimeLength = getLongBEAt(pictureData, offset2);
          offset2 += 4;
          const mime = getStringAt(pictureData, offset2, mimeLength);
          offset2 += mimeLength;
          const descriptionLength = getLongBEAt(pictureData, offset2);
          offset2 += 4;
          const description = getStringAt(pictureData, offset2, descriptionLength);
          offset2 += descriptionLength + 16;
          const pictureLength = getLongBEAt(pictureData, offset2);
          offset2 += 4;
          const picture = pictureData.slice(offset2, offset2 + pictureLength);
          result.tags.picture = {
            format: mime,
            type: [
              "Other",
              "32x32 pixels 'file icon' (PNG only)",
              "Other file icon",
              "Cover (front)",
              "Cover (back)",
              "Leaflet page",
              "Media (e.g. label side of CD)",
              "Lead artist/lead performer/soloist",
              "Artist/performer",
              "Conductor",
              "Band/Orchestra",
              "Composer",
              "Lyricist/text writer",
              "Recording Location",
              "During recording",
              "During performance",
              "Movie/video screen capture",
              "A bright coloured fish",
              "Illustration",
              "Band/artist logotype",
              "Publisher/Studio logotype"
            ][type],
            description,
            data: picture
          };
          break;
      }
    }
    return result;
  }
};

// lib/index.ts
var mediaFileReaders = [];
var mediaTagReaders = [];
function read(location, callbacks) {
  new Reader(location).read(callbacks);
}
function isRangeValid(range, fileSize) {
  const invalidPositiveRange = range.offset >= 0 && range.offset + range.length >= fileSize;
  const invalidNegativeRange = range.offset < 0 && (-range.offset > fileSize || range.offset + range.length > 0);
  return !(invalidPositiveRange || invalidNegativeRange);
}
var Reader = class {
  _file;
  _tagsToRead = [];
  _fileReader;
  _tagReader;
  constructor(file) {
    this._file = file;
  }
  setTagsToRead(tagsToRead) {
    this._tagsToRead = tagsToRead;
    return this;
  }
  setFileReader(fileReader) {
    this._fileReader = fileReader;
    return this;
  }
  setTagReader(tagReader) {
    this._tagReader = tagReader;
    return this;
  }
  read(callbacks) {
    var FileReader = this._getFileReader();
    var fileReader = new FileReader(this._file);
    var self = this;
    fileReader.init({
      onSuccess: function() {
        self._getTagReader(fileReader, {
          onSuccess: function(TagReader) {
            new TagReader(fileReader).setTagsToRead(self._tagsToRead).read(callbacks);
          },
          onError: callbacks.onError
        });
      },
      onError: callbacks.onError
    });
  }
  _getFileReader() {
    if (this._fileReader) {
      return this._fileReader;
    } else {
      return this._findFileReader();
    }
  }
  _findFileReader() {
    for (var i = 0; i < mediaFileReaders.length; i++) {
      if (mediaFileReaders[i].canReadFile(this._file)) {
        return mediaFileReaders[i];
      }
    }
    throw new Error("No suitable file reader found for " + this._file);
  }
  _getTagReader(fileReader, callbacks) {
    if (this._tagReader) {
      var tagReader = this._tagReader;
      setTimeout(function() {
        callbacks.onSuccess(tagReader);
      }, 1);
    } else {
      this._findTagReader(fileReader, callbacks);
    }
  }
  _findTagReader(fileReader, callbacks) {
    var tagReadersAtFileStart = [];
    var tagReadersAtFileEnd = [];
    var fileSize = fileReader.getSize();
    for (var i = 0; i < mediaTagReaders.length; i++) {
      var range = mediaTagReaders[i].getTagIdentifierByteRange();
      if (!isRangeValid(range, fileSize)) {
        continue;
      }
      if (range.offset >= 0 && range.offset < fileSize / 2 || range.offset < 0 && range.offset < -fileSize / 2) {
        tagReadersAtFileStart.push(mediaTagReaders[i]);
      } else {
        tagReadersAtFileEnd.push(mediaTagReaders[i]);
      }
    }
    var tagsLoaded = false;
    var loadTagIdentifiersCallbacks = {
      onSuccess: function() {
        if (!tagsLoaded) {
          tagsLoaded = true;
          return;
        }
        for (var i2 = 0; i2 < mediaTagReaders.length; i2++) {
          var range2 = mediaTagReaders[i2].getTagIdentifierByteRange();
          if (!isRangeValid(range2, fileSize)) {
            continue;
          }
          try {
            var tagIndentifier = fileReader.getBytesAt(
              range2.offset >= 0 ? range2.offset : range2.offset + fileSize,
              range2.length
            );
          } catch (ex) {
            if (callbacks.onError) {
              callbacks.onError({
                type: "fileReader",
                info: ex.message
              });
            }
            return;
          }
          if (mediaTagReaders[i2].canReadTagFormat(tagIndentifier)) {
            callbacks.onSuccess(mediaTagReaders[i2]);
            return;
          }
        }
        if (callbacks.onError) {
          callbacks.onError({
            type: "tagFormat",
            info: "No suitable tag reader found"
          });
        }
      },
      onError: callbacks.onError
    };
    this._loadTagIdentifierRanges(
      fileReader,
      tagReadersAtFileStart,
      loadTagIdentifiersCallbacks
    );
    this._loadTagIdentifierRanges(
      fileReader,
      tagReadersAtFileEnd,
      loadTagIdentifiersCallbacks
    );
  }
  _loadTagIdentifierRanges(fileReader, tagReaders, callbacks) {
    if (tagReaders.length === 0) {
      setTimeout(callbacks.onSuccess, 1);
      return;
    }
    var tagIdentifierRange = [Number.MAX_VALUE, 0];
    var fileSize = fileReader.getSize();
    for (var i = 0; i < tagReaders.length; i++) {
      var range = tagReaders[i].getTagIdentifierByteRange();
      var start = range.offset >= 0 ? range.offset : range.offset + fileSize;
      var end = start + range.length - 1;
      tagIdentifierRange[0] = Math.min(start, tagIdentifierRange[0]);
      tagIdentifierRange[1] = Math.max(end, tagIdentifierRange[1]);
    }
    fileReader.loadRange(tagIdentifierRange, callbacks);
  }
};
var Config = class _Config {
  static addFileReader(fileReader) {
    mediaFileReaders.push(fileReader);
    return _Config;
  }
  static addTagReader(tagReader) {
    mediaTagReaders.push(tagReader);
    return _Config;
  }
  static removeTagReader(tagReader) {
    var tagReaderIx = mediaTagReaders.indexOf(tagReader);
    if (tagReaderIx >= 0) {
      mediaTagReaders.splice(tagReaderIx, 1);
    }
    return _Config;
  }
};
Config.addFileReader(FetchFileReader).addTagReader(ID3v2TagReader).addTagReader(ID3v1TagReader).addTagReader(MP4TagReader).addTagReader(FLACTagReader).addTagReader(OggTagReader);
function getCommonMetadata(url) {
  return new Promise((resolve, reject) => {
    if (!url.startsWith("http")) {
      url = new URL(url, window.location.href).href;
    }
    read(url, {
      onSuccess(data) {
        const title = data.tags.title;
        const artist = data.tags.artist;
        const album = data.tags.album;
        let pictureData = data.tags.picture;
        if (Array.isArray(pictureData)) {
          pictureData = pictureData.find(
            (p) => p.type === "Cover (front)"
          );
        }
        let cover = void 0;
        if (pictureData) {
          const buffer = new Uint8Array(pictureData.data);
          const type = pictureData.type;
          const blob = new Blob([buffer], { type });
          cover = URL.createObjectURL(blob);
        }
        resolve({
          title,
          artist,
          album,
          cover
        });
      },
      onError(error) {
        reject(error);
      }
    });
  });
}
export {
  Config,
  Reader,
  getCommonMetadata,
  read
};
