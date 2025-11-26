import Foundation
import Observation

@Observable
class NewsViewModel {
    var newsItems: [NewsItem] = []
    var isLoading: Bool = false
    var errorMessage: String?
    
    private let apiService = APIService.shared
    
    func loadNews() async {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil
        
        do {
            newsItems = try await apiService.fetchNews()
        } catch {
            errorMessage = "Failed to load news: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    func refresh() async {
        isLoading = true
        // Trigger backend fetch (fire and forget or wait)
        // For now, just reload local list assuming backend background task is running or we just want latest db state
        await loadNews()
    }
}

