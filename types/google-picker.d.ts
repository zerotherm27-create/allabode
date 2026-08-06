export {};

declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void;
    };
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
        };
      };
      picker: {
        PickerBuilder: new () => GooglePickerBuilder;
        DocsView: new (viewId: string) => GoogleDocsView;
        ViewId: { DOCS: string; DOCS_IMAGES: string };
        Feature: { MULTISELECT_ENABLED: string };
        Action: { PICKED: string; CANCEL: string };
        Response: { ACTION: string; DOCUMENTS: string };
        Document: { ID: string; NAME: string; SIZE_BYTES: string; MIME_TYPE: string };
      };
    };
  }

  interface GoogleDocsView {
    setIncludeFolders: (v: boolean) => GoogleDocsView;
    setSelectFolderEnabled: (v: boolean) => GoogleDocsView;
    setParent: (parentId: string) => GoogleDocsView;
    setMimeTypes: (mimeTypes: string) => GoogleDocsView;
    setOwnedByMe: (me: boolean) => GoogleDocsView;
    setEnableDrives: (enabled: boolean) => GoogleDocsView;
    setLabel: (label: string) => GoogleDocsView;
  }

  interface GooglePickerBuilder {
    addView: (view: GoogleDocsView | string) => GooglePickerBuilder;
    setOAuthToken: (token: string) => GooglePickerBuilder;
    setDeveloperKey: (key: string) => GooglePickerBuilder;
    setAppId: (appId: string) => GooglePickerBuilder;
    setOrigin: (origin: string) => GooglePickerBuilder;
    setTitle: (title: string) => GooglePickerBuilder;
    enableFeature: (feature: string) => GooglePickerBuilder;
    setCallback: (cb: (data: Record<string, unknown>) => void) => GooglePickerBuilder;
    build: () => { setVisible: (v: boolean) => void };
  }
}
