export interface Converter<DocumentType, ViewModelType> {
    convertToDocument(item: ViewModelType): DocumentType;
    convertToViewModel(item: DocumentType): ViewModelType;
}
