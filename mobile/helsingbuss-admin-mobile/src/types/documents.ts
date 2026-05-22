export type AppDocumentItem = {
  id: string;
  title: string;
  documentType: string;
  category?: string;
  description?: string;
  status: string;
  linkedType?: string;
  linkedId?: string;
  validFrom?: string;
  expiresAt?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSize?: number;
  storageBucket?: string;
  storagePath?: string;
  externalUrl?: string;
  isConfidential?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type DocumentsOverview = {
  summary: {
    totalCount: number;
    agreementCount: number;
    permitCount: number;
    internalCount: number;
    expiringCount: number;
    expiredCount: number;
  };
  documents: AppDocumentItem[];
};
