import Foundation

// MARK: - News Model
struct NewsItem: Identifiable, Codable, Hashable {
    let id: Int
    let title: String
    let url: String
    let summary: String
    let contentRaw: String?
    let source: String
    let category: String?
    let date: String
    let starred: Int
    
    enum CodingKeys: String, CodingKey {
        case id, title, url, summary
        case contentRaw = "content_raw"
        case source, category, date, starred
    }
}

struct NewsResponse: Codable {
    let news: [NewsItem]
    let count: Int
}

// MARK: - Analysis Model
struct ArticleAnalysis: Codable, Equatable {
    let summary: String
    let structure: [ArticleStructure]
    let vocabulary: [VocabularyItem]
}

struct ArticleStructure: Codable, Identifiable, Equatable {
    var id: String { section }
    let section: String
    let description: String
}

struct VocabularyItem: Codable, Identifiable, Equatable {
    var id: String { term }
    let term: String
    let definition: String
    let example: String
}

struct AnalysisResponse: Codable {
    let status: String
    let analysis: ArticleAnalysis
}

// MARK: - Phrase Model
struct SavedPhrase: Identifiable, Codable {
    let id: Int
    let newsId: Int
    let text: String
    let note: String?
    let type: String?
    let createdAt: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case newsId = "news_id"
        case text, note, type
        case createdAt = "created_at"
    }
}

