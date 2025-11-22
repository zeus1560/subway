// Jest 설정 파일
require("@testing-library/jest-dom");

// Node.js 환경에서 필요한 Web API polyfill
if (typeof globalThis.TextDecoder === "undefined") {
  const { TextDecoder, TextEncoder } = require("util");
  global.TextDecoder = TextDecoder;
  global.TextEncoder = TextEncoder;
}

// Next.js의 NextRequest가 내부적으로 사용하는 Request polyfill
if (typeof globalThis.Request === "undefined") {
  // Next.js가 요구하는 최소한의 Request 구현
  global.Request = class Request {
    constructor(input, init = {}) {
      if (typeof input === "string") {
        this._url = input;
      } else if (input && input.url) {
        this._url = input.url;
      } else {
        this._url = "http://localhost/";
      }
      this.method = init.method || "GET";
      this._headers = new Map();
      if (init.headers) {
        if (init.headers instanceof Map) {
          this._headers = new Map(init.headers);
        } else if (typeof init.headers.forEach === "function") {
          init.headers.forEach((value, key) => {
            this._headers.set(key, value);
          });
        } else {
          Object.entries(init.headers).forEach(([key, value]) => {
            this._headers.set(key, value);
          });
        }
      }
      this.body = init.body || null;
    }
    get url() {
      return this._url;
    }
    get headers() {
      return this._headers;
    }
  };
}

// Next.js의 NextResponse가 내부적으로 사용하는 Response polyfill
if (typeof globalThis.Response === "undefined") {
  global.Response = class Response {
    constructor(body, init = {}) {
      this._body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || "OK";
      this._headers = new Map();
      if (init.headers) {
        if (init.headers instanceof Map) {
          this._headers = new Map(init.headers);
        } else if (typeof init.headers.forEach === "function") {
          init.headers.forEach((value, key) => {
            this._headers.set(key, value);
          });
        } else {
          Object.entries(init.headers).forEach(([key, value]) => {
            this._headers.set(key, value);
          });
        }
      }
    }
    get headers() {
      return this._headers;
    }
    json() {
      return Promise.resolve(
        typeof this._body === "string" ? JSON.parse(this._body) : this._body
      );
    }
    text() {
      return Promise.resolve(
        typeof this._body === "string" ? this._body : JSON.stringify(this._body)
      );
    }
  };
}

// localStorage mock
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// fetch mock
global.fetch = jest.fn();
