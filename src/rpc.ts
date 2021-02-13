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

export interface RPCResponse<T> {
  jsonrpc: string;
  result: T;
  id: number;
}

export interface RPCValidationResponse {
  Ok?: true;
  ParserErr?: RPCParserErr;
  ValidationErr?: RPCValidationErr;
  UnknownError?: RPCUnknownError;
}

export interface RPCGetFileTreeResponse {
  types: string[];
  global_variables: string[];
  functions: string[];
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

export interface RPCGetFileTreeRequest extends RPCRequest {
  method: "get_file_tree";
  params: {
    path: string;
  };
}
