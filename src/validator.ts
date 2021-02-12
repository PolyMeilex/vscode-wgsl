import * as vscode from "vscode";

import * as cp from "child_process";

interface RPCResponse {
  jsonrpc: string;
  result: any;
  id: number;
}

export class Validator {
  server: cp.ChildProcessWithoutNullStreams;
  callbacks: { [key: number]: (data: RPCResponse) => void };
  currId: number = 1;

  constructor(bin: string) {
    this.server = cp.spawn(bin, ["--server"]);
    this.server.stdin.setDefaultEncoding("utf8");
    this.server.stdout.setEncoding("utf8");
    this.server.stderr.setEncoding("utf8");

    this.callbacks = {};

    this.server.stdout.on("data", (data: string) => {
      const msgs = data.split("\n").filter((msg) => msg.length != 0);

      msgs.forEach((msgString) => {
        try {
          let msg: RPCResponse = JSON.parse(msgString);

          if (msg) {
            if (msg.jsonrpc === "2.0" && typeof msg.id === "number") {
              if (msg.result != null) {
                let cb = this.callbacks[msg.id];
                if (cb) {
                  cb(msg);
                  delete this.callbacks[msg.id];
                }
              } else {
                delete this.callbacks[msg.id];
              }
            }
          }
        } catch (e) {
          console.error(e, data, msgs);
        }
      });
    });
  }

  validateFile(document: vscode.TextDocument, cb: (data: RPCResponse) => void) {
    this.callbacks[this.currId] = cb;

    const req = {
      jsonrpc: "2.0",
      method: "validate_file",
      params: {
        path: document.fileName,
      },
      id: this.currId,
    };

    this.server.stdin.write(JSON.stringify(req) + "\n");

    this.currId += 1;
  }

  dispose() {
    console.log("dispose");
    this.server.kill();
  }
}
