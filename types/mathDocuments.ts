export interface UserData {
    email?: string;
    name?: string;
    userId?: string;
}

export interface MathDocument {
    id: string;
    title: string;
    description: string;
    createdAt: number;
    lastOpenedAt: number;
}

export interface MathDocumentPageFollowUp {
    id: string;
    prompt: string;
    createdAt: number;
    resultingMarkdown: string;
}

export interface MathDocumentPage {
    id: string;
    documentId: string;
    pageNumber: number;
    title: string;
    imageUrl: string;
    markdown: string;
    lastAiPrompt: string;
    lastGeneratedAt?: number;
    followUps: MathDocumentPageFollowUp[];
}

export interface ConvertMathImageArgs {
    imageUrl: string;
    guidance?: string;
    currentMarkdown?: string;
    followUpPrompt?: string;
    documentTitle?: string;
    pageTitle?: string;
}
