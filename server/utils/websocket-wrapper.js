import WebSocket from 'ws';

/**
 * Node-compatible WebSocket wrapper for Stacks v7.2.
 * Makes 'ws' behave like a browser WebSocket.
 */
export class NodeWebSocketWrapper {
  constructor(url) {
    const ws = new WebSocket(url);

    // Polyfill browser-like event methods
    ws.addEventListener = (event, listener) => {
      ws.on(event, (data) => {
        if (event === 'message') {
          listener({ data: data.toString() }); // mimic MessageEvent
        } else {
          listener(data);
        }
      });
    };

    ws.removeEventListener = (event, listener) => {
      ws.off(event, listener);
    };

    return ws;
  }
}
