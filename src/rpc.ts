export interface RPCParserErr {
  error: string;
  scopes: string[];
  line: number;
  pos: number;
}

export interface RPCValidationErr {
  message: string;
  debug: string;
}

export type RPCUnknownError = string;

export interface RPCResponse {
  jsonrpc: string;
  result:
    | "Ok"
    | {
        ParserErr: RPCParserErr;
        ValidationErr: RPCValidationErr;
        UnknownError: RPCUnknownError;
      };
  id: number;
}

//
//
//

export interface RPCRequest {
  jsonrpc: "2.0";
  method: string;
  params: any;
  id: number;
}

export interface RPCValidateFileRequest extends RPCRequest {
  method: "validate_file";
  params: {
    path: string;
  };
}
