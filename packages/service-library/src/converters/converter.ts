// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface Converter<DocumentType, ViewModelType> {
    convertToDocument(item: ViewModelType): DocumentType;
    convertToViewModel(item: DocumentType): ViewModelType;
}
