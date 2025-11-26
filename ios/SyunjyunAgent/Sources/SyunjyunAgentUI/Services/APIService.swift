import Foundation
import OSLog

@Observable
class APIService {
    static let shared = APIService()
    
    // Assuming backend is running locally on default port
    // In a real app, this would be in a configuration file
    private let baseURL = URL(string: "http://127.0.0.1:8500/api")!
    private let logger = Logger(subsystem: "com.syunjyun.agent", category: "APIService")
    
    // MARK: - Settings
    func updateSetting(key: String, value: String) async throws {
        let url = baseURL.appendingPathComponent("settings")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: String] = ["key": key, "value": value]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
    }
    
    // MARK: - News Fetching
    func fetchNews(limit: Int = 50, offset: Int = 0) async throws -> [NewsItem] {
        var components = URLComponents(url: baseURL.appendingPathComponent("news"), resolvingAgainstBaseURL: true)!
        components.queryItems = [
            URLQueryItem(name: "limit", value: String(limit)),
            URLQueryItem(name: "offset", value: String(offset))
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        
        let result = try JSONDecoder().decode(NewsResponse.self, from: data)
        return result.news
    }
    
    func fetchNewsDetail(id: Int) async throws -> NewsItem {
        let url = baseURL.appendingPathComponent("news/\(id)")
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        
        return try JSONDecoder().decode(NewsItem.self, from: data)
    }

    func refetchNewsContent(id: Int) async throws -> NewsItem {
        // For now, we just re-fetch the detail.
        // In the future, if we add a backend endpoint to force-re-scrape, we would call that here.
        // But since the user just wants a "refresh" button to get the latest cleaned data from DB:
        return try await fetchNewsDetail(id: id)
    }
    
    // MARK: - Analysis
    func analyzeArticle(id: Int) async throws -> ArticleAnalysis {
        let url = baseURL.appendingPathComponent("news/\(id)/analyze")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        if httpResponse.statusCode != 200 {
            // Try to decode error message
            if let errorJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let detail = errorJson["detail"] as? String {
                logger.error("Analysis failed: \(detail)")
                throw APIError.serverError(detail)
            }
            throw APIError.invalidResponse
        }
        
        let result = try JSONDecoder().decode(AnalysisResponse.self, from: data)
        return result.analysis
    }
    
    // MARK: - Phrases
    func fetchPhrases(newsId: Int) async throws -> [SavedPhrase] {
        var components = URLComponents(url: baseURL.appendingPathComponent("phrases"), resolvingAgainstBaseURL: true)!
        components.queryItems = [URLQueryItem(name: "news_id", value: String(newsId))]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        
        struct PhrasesResponse: Codable {
            let phrases: [SavedPhrase]
            let count: Int
        }
        
        let result = try JSONDecoder().decode(PhrasesResponse.self, from: data)
        return result.phrases
    }

    func savePhrase(newsId: Int, text: String, note: String?, type: String = "vocabulary") async throws {
        let url = baseURL.appendingPathComponent("phrases")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "news_id": newsId,
            "text": text,
            "note": note ?? "",
            "type": type
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
    }
    
    // MARK: - Learning & AI
    
    func checkSentence(term: String, sentence: String) async throws -> String {
        let url = baseURL.appendingPathComponent("learning/check-sentence")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: String] = [
            "term": term,
            "sentence": sentence
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        
        struct CheckResponse: Codable {
            let status: String
            let feedback: String
        }
        
        let result = try JSONDecoder().decode(CheckResponse.self, from: data)
        return result.feedback
    }
    
    func explainConcept(term: String, context: String?) async throws -> String {
        let url = baseURL.appendingPathComponent("learning/explain-concept")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: String] = ["term": term]
        if let context = context {
            body["context"] = context
        }
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        
        struct ExplainResponse: Codable {
            let status: String
            let explanation: String
        }
        
        let result = try JSONDecoder().decode(ExplainResponse.self, from: data)
        return result.explanation
    }
    
    func defineWord(term: String) async throws -> String {
        let url = baseURL.appendingPathComponent("learning/define")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: String] = ["term": term]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        
        struct DefineResponse: Codable {
            let status: String
            let definition: String
        }
        
        let result = try JSONDecoder().decode(DefineResponse.self, from: data)
        return result.definition
    }
    
    // MARK: - Sources
    func testSource(url: String) async throws -> Bool {
        var components = URLComponents(url: baseURL.appendingPathComponent("news/sources/test"), resolvingAgainstBaseURL: true)!
        components.queryItems = [URLQueryItem(name: "url", value: url)]
        
        guard let requestUrl = components.url else { return false }
        
        let (data, response) = try await URLSession.shared.data(from: requestUrl)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            return false
        }
        
        struct TestResponse: Codable {
            let status: String
            let message: String
        }
        
        let result = try JSONDecoder().decode(TestResponse.self, from: data)
        return result.status == "success"
    }

    // MARK: - TTS
    func generateSpeech(text: String) async throws -> TTSResponse {
        let url = baseURL.appendingPathComponent("tts")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: String] = ["text": text]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        if httpResponse.statusCode != 200 {
             if let errorJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let detail = errorJson["detail"] as? String {
                throw APIError.serverError(detail)
            }
            throw APIError.serverError("TTS Request failed with status \(httpResponse.statusCode)")
        }
        
        return try JSONDecoder().decode(TTSResponse.self, from: data)
    }
}

struct TTSResponse: Codable {
    let status: String
    let audio: String // Base64 encoded
    let subtitles: [SubtitleItem]?
}

struct SubtitleItem: Codable, Identifiable {
    var id: String { "\(begin_time)-\(end_time)-\(text)" }
    let text: String
    let begin_time: Double // milliseconds
    let end_time: Double
}

enum APIError: Error {
    case invalidURL
    case invalidResponse
    case serverError(String)
    case decodingError
}
