import SwiftUI

enum UserMode: String, CaseIterable, Identifiable {
    case englishLearner = "English Learner"
    case aiLearner = "AI Learner"
    
    var id: String { self.rawValue }
    
    var displayName: String {
        switch self {
        case .englishLearner: return "英语学习"
        case .aiLearner: return "AI 资讯"
        }
    }
    
    var icon: String {
        switch self {
        case .englishLearner: return "character.book.closed"
        case .aiLearner: return "waveform.path.ecg"
        }
    }
}

class UserPreferenceStore: ObservableObject {
    @AppStorage("user_mode_preference") var currentMode: UserMode = .englishLearner
    
    // Remote Settings
    @AppStorage("model_provider") var modelProvider: String = "local" // "local" or "remote"
    @AppStorage("remote_provider") var remoteProvider: String = "MINIMAX"
    @AppStorage("remote_api_key") var remoteApiKey: String = "sk-demo-key-do-not-change"
    
    // Local Settings
    @AppStorage("local_model_base_url") var localModelBaseUrl: String = "http://127.0.0.1:1234/v1"
    @AppStorage("local_model_name") var localModelName: String = "gpt-oss-20B"
    
    // Backend Connection
    @AppStorage("local_host") var localHost: String = "127.0.0.1"
    @AppStorage("local_port") var localPort: String = "8500"
}

