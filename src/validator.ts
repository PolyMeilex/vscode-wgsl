import * as vscode from "vscode";

import * as cp from "child_process";

import {
  RPCGetFileTreeRequest,
  RPCGetFileTreeResponse,
  RPCResponse,
  RPCValidateFileRequest,
  RPCValidationResponse,
} from "./rpc";

export class Validator {
  server: cp.ChildProcessWithoutNullStreams;
  callbacks: { [key: number]: (data: RPCResponse<any> | null) => void };
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
          let msg: RPCResponse<any> = JSON.parse(msgString);

          if (msg) {
            if (msg.jsonrpc === "2.0" && typeof msg.id === "number") {
              let cb = this.callbacks[msg.id];
              if (cb) {
                if ((msg as any).error) {
                  vscode.window.showErrorMessage(
                    `${JSON.stringify(msg, null, "\t")}`
                  );
                  cb(null);
                } else {
                  cb(msg);
                }
                delete this.callbacks[msg.id];
              }
            }
          }
        } catch (e) {
          console.error(e, data, msgs);
        }
      });
    });

    this.versionCheck();
  }

  versionCheck() {
    this.callbacks[this.currId] = (res: any) => {
      if (res.result != "0.0.1") {
        vscode.window.showErrorMessage(
          `It looks like your cargo-wgsl is outdated. Please run "cargo install cargo-wgsl"`
        );
      }
    };

    const req = {
      jsonrpc: "2.0",
      method: "version",
      params: {},
      id: this.currId,
    };

    this.server.stdin.write(JSON.stringify(req) + "\n");

    this.currId += 1;
  }

  getFileTree(
    document: vscode.TextDocument,
    cb: (data: RPCResponse<RPCGetFileTreeResponse | null> | null) => void
  ) {
    if (document.uri.scheme == "file") {
      this.callbacks[this.currId] = cb;

      console.log(document.uri.fsPath);

      const req: RPCGetFileTreeRequest = {
        jsonrpc: "2.0",
        method: "get_file_tree",
        params: {
          path: document.uri.fsPath,
        },
        id: this.currId,
      };

      this.server.stdin.write(JSON.stringify(req) + "\n");

      this.currId += 1;
    }
  }

  validateFile(
    document: vscode.TextDocument,
    cb: (data: RPCResponse<RPCValidationResponse> | null) => void
  ) {
    if (document.uri.scheme == "file") {
      this.callbacks[this.currId] = cb;

      const req: RPCValidateFileRequest = {
        jsonrpc: "2.0",
        method: "validate_file",
        params: {
          path: document.uri.fsPath,
        },
        id: this.currId,
      };

      this.server.stdin.write(JSON.stringify(req) + "\n");

      this.currId += 1;
    }
  }

  dispose() {
    console.log("dispose");
    this.server.kill();
  }
}
