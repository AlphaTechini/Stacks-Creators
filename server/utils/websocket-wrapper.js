import WebSocket from 'ws';

export class NodeWebSocketWrapper extends WebSocket {
  constructor(url, protocols) {
    super(url, protocols);

    // patch addEventListener & removeEventListener
    this.addEventListener = (event, listener) => {
      this.on(event, (data) => {
        // If message event, wrap as object with `.data`
        if (event === 'message') {
          listener({ data: data.toString() });
        } else {
          listener(data);
        }
      });
    };

    this.removeEventListener = (event, listener) => {
      this.off(event, listener);
    };
  }
}
