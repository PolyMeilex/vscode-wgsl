import * as vscode from "vscode";
import * as hasbin from "hasbin";

import { Validator } from "./validator";

class ParseIterator {
  line: string[];

  constructor(line: string[]) {
    this.line = line;
  }

  next(): string | undefined {
    return this.line.shift();
  }
}

class WgslDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  public provideDocumentSymbols(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): Promise<vscode.DocumentSymbol[]> {
    return new Promise((resolve, reject) => {
      const symbols: vscode.DocumentSymbol[] = [];
      for (var i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        let text = line.text.trim();

        let sections = text.split(" ");

        let iter = new ParseIterator(sections);

        let isFn = false;
        for (let n = iter.next(); n != undefined; n = iter.next()) {
          if (n == "fn") {
            isFn = true;
            break;
          }
        }

        if (isFn) {
          let fn = iter.next();

          if (fn) {
            let symbol = new vscode.DocumentSymbol(
              fn.split("(")[0],
              "",
              vscode.SymbolKind.Function,
              line.range,
              line.range
            );
            symbols.push(symbol);
          }
        }
      }
      resolve(symbols);
    });
  }
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      { scheme: "file", language: "wgsl" },
      new WgslDocumentSymbolProvider()
    )
  );

  hasbin.first(["cargo-wgsl"], (res) => {
    console.log(res);
    if (res) {
      const validator = new Validator(res);
      context.subscriptions.push(vscode.Disposable.from(validator));

      let diagCol = vscode.languages.createDiagnosticCollection();

      const config = vscode.workspace.getConfiguration();

      context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument((doc) => {
          lint(validator, doc, diagCol);
        })
      );

      if (config.get("wgsl.validateOnSave") == true)
        context.subscriptions.push(
          vscode.workspace.onDidSaveTextDocument((doc) => {
            lint(validator, doc, diagCol);
          })
        );

      if (config.get("wgsl.validateOnType") == true)
        context.subscriptions.push(
          vscode.workspace.onDidChangeTextDocument((doc) => {
            lint(validator, doc.document, diagCol);
          })
        );

      context.subscriptions.push(
        vscode.commands.registerCommand("wgsl.validateFile", () => {
          let document = vscode.window.activeTextEditor?.document;
          if (document) {
            lint(validator, document, diagCol);
          }
        })
      );

      // Validate on editor open
      let document = vscode.window.activeTextEditor?.document;
      if (document) {
        lint(validator, document, diagCol);
      }
    }
  });
}

function lint(
  validator: Validator,
  document: vscode.TextDocument,
  diagCol: vscode.DiagnosticCollection
) {
  if (document.languageId == "wgsl") {
    validator.validateFile(document, (json) => {
      if (document != null) {
        diagCol.delete(document.uri);

        if (json.result != "Ok" && typeof json.result != "string") {
          if (json.result.ParserErr) {
            let err = json.result.ParserErr;

            let diagnostics: vscode.Diagnostic[] = [];
            let start = new vscode.Position(err.line - 1, err.pos);
            let end = new vscode.Position(err.line - 1, err.pos);
            let diagnostic: vscode.Diagnostic = {
              severity: vscode.DiagnosticSeverity.Error,
              range: new vscode.Range(start, end),
              message: err.error,
              source: "cargo-wgsl",
            };

            diagnostics.push(diagnostic);

            diagCol.set(document.uri, diagnostics);
          } else if (json.result.ValidationErr) {
            let err = json.result.ValidationErr;

            let diagnostics: vscode.Diagnostic[] = [];
            let start = new vscode.Position(0, 0);
            let end = new vscode.Position(document.lineCount - 1, 0);

            let diagnostic: vscode.Diagnostic = {
              severity: vscode.DiagnosticSeverity.Error,
              range: new vscode.Range(start, end),
              message: `${err.message}\n\n${err.debug}`,
              source: "cargo-wgsl",
            };

            diagnostics.push(diagnostic);

            diagCol.set(document.uri, diagnostics);
          } else if (json.result.UnknownError) {
            let diagnostics: vscode.Diagnostic[] = [];
            let start = new vscode.Position(0, 0);
            let end = new vscode.Position(document.lineCount - 1, 0);

            let diagnostic: vscode.Diagnostic = {
              severity: vscode.DiagnosticSeverity.Error,
              range: new vscode.Range(start, end),
              message: json.result.UnknownError,
              source: "cargo-wgsl",
            };

            diagnostics.push(diagnostic);

            diagCol.set(document.uri, diagnostics);
          }
        }
      }
    });
  }
}

export function deactivate() {}
