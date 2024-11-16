class Semaphore {
    constructor(count = 1) {
        this.count = count;
        /** @type {(() => void)[]} */
        this.pending = [];
    }

    acquire() {
        return new Promise(resolve => {
            if (this.count) {
                this.count--;
                resolve();
            } else {
                this.pending.push(() => {
                    this.count--;
                    resolve();
                });
            }
        });
    }

    release() {
        this.count++;
        if (this.pending.length) this.pending.shift()();
    }
}

const semaphore = new Semaphore(5);

class Uploader {
    /**
     * @param {String} url
     * @param {File} file
     * @param {() => void} onSuccess
     * @param {() => void} onError
     */
    constructor(url, file, onSuccess, onError) {
        this.url = url;
        this.file = file;
        this.onSuccess = onSuccess || (() => {});
        this.onError = onError || (() => {});
        this.loaded = 0;
        this.lastUptime = 0;
        this.speed = 0;
        this.uploaded = false;
        this.aborted = false;
        /** @type {XMLHttpRequest | null} */
        this.xhr = null;
        /** @type {String | null} */
        this.fail = null;
    }

    upload() {
        if (this.uploaded || this.aborted) return;
        const xhr = new XMLHttpRequest;
        xhr.addEventListener('readystatechange', () => {
            if (xhr.readyState !== XMLHttpRequest.DONE) return;
            if (xhr.status >= 400) {
                this.fail = xhr.statusText;
            } else if (xhr.status >= 200 && xhr.status < 300) {
                this.uploaded = true;
                this.onSuccess();
                semaphore.release();
            }
        });
        xhr.addEventListener('error', () => {
            this.fail = 'dialogUploadError';
            this.onError();
            semaphore.release();
        });
        xhr.addEventListener('abort', () => {
            this.fail = 'dialogUploadAbort';
            this.aborted = true;
            semaphore.release();
        });
        xhr.upload.addEventListener('progress', e => {
            const now = Date.now();
            this.speed = (e.loaded - this.loaded) / (now - this.lastUptime) * 1000;
            this.loaded = e.loaded;
            this.lastUptime = now;
        });
        semaphore.acquire().then(() => {
            if (this.aborted) {
                semaphore.release();
            } else {
                xhr.open('PUT', this.url);
                xhr.send(this.file);
                this.lastUptime = Date.now();
                this.xhr = xhr;
            }
        });
    }
}

export default Uploader;