import * as vscode from "vscode";

class ParseIterator {
  line: string[];

  constructor(line: string[]) {
    this.line = line;
  }

  next(): string | undefined {
    return this.line.shift();
  }
}

export class WgslDocumentSymbolProvider
  implements vscode.DocumentSymbolProvider {
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
