import Foundation
import Observation
import AVFoundation

@Observable
class ArticleDetailViewModel: NSObject, AVAudioPlayerDelegate {
    var newsItem: NewsItem
    var analysis: ArticleAnalysis?
    var isAnalyzing: Bool = false
    var analysisError: String?
    var selectedText: String?
    var isRefreshing: Bool = false
    
    // Audio State
    var audioPlayer: AVAudioPlayer?
    var isPlayingAudio: Bool = false
    var isGeneratingAudio: Bool = false
    var audioError: String?
    var audioDuration: TimeInterval = 0
    var currentAudioTime: TimeInterval = 0
    var subtitles: [SubtitleItem] = []
    
    private var timer: Timer?
    
    private let apiService = APIService.shared
    
    init(newsItem: NewsItem) {
        self.newsItem = newsItem
        super.init()
    }

    func refreshContent() async {
        guard !isRefreshing else { return }
        isRefreshing = true
        
        do {
            // Fetch latest data for this article from backend
            let updatedItem = try await apiService.refetchNewsContent(id: newsItem.id)
            // In SwiftUI, we can't easily replace the whole `newsItem` struct if it's a let property or passed in init.
            // But we can trigger a UI update if we had a way to bubble this up.
            // For this ViewModel, let's assume we might need to expose published properties for title/content
            // instead of relying solely on the static `newsItem`.
            
            // However, since `newsItem` is a `let` in this ViewModel currently, we should probably refactor 
            // to allow it to be updated or expose individual fields.
            // For minimal invasion: we'll cheat slightly and just say "refresh completed", 
            // but the View relies on `newsItem`. 
            
            // CORRECT APPROACH: Make `newsItem` a `@Observable` property or similar.
            // Let's change `let newsItem` to `var newsItem`.
            self.newsItem = updatedItem
            
        } catch {
            print("Refresh failed: \(error)")
        }
        
        isRefreshing = false
    }
    
    func analyze() async {
        guard analysis == nil && !isAnalyzing else { return }
        
        isAnalyzing = true
        analysisError = nil
        
        do {
            analysis = try await apiService.analyzeArticle(id: newsItem.id)
        } catch {
            analysisError = "Analysis failed: \(error.localizedDescription)"
        }
        
        isAnalyzing = false
    }
    
    func toggleAudio() async {
        if isPlayingAudio {
            audioPlayer?.pause()
            isPlayingAudio = false
            timer?.invalidate()
            return
        }
        
        // Resume if existing
        if let player = audioPlayer {
            player.play()
            isPlayingAudio = true
            startTimer()
            return
        }
        
        // Generate new
        guard !isGeneratingAudio else { return }
        isGeneratingAudio = true
        audioError = nil
        
        do {
            // Configure session for playback
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio)
            try AVAudioSession.sharedInstance().setActive(true)
            
            // Use full content if available, otherwise summary
            let textToRead = newsItem.contentRaw ?? newsItem.summary
            // Remove markdown headers or simple cleanup if needed, but API usually handles text well
            
            let result = try await apiService.generateSpeech(text: textToRead)
            
            if let audioData = Data(base64Encoded: result.audio) {
                audioPlayer = try AVAudioPlayer(data: audioData)
                audioPlayer?.delegate = self
                audioPlayer?.prepareToPlay()
                audioDuration = audioPlayer?.duration ?? 0
                subtitles = result.subtitles ?? []
                
                audioPlayer?.play()
                isPlayingAudio = true
                startTimer()
            } else {
                audioError = "音频数据解码失败"
            }
            
        } catch {
            audioError = "语音生成失败: \(error.localizedDescription)"
            print("Audio Error: \(error)")
        }
        
        isGeneratingAudio = false
    }
    
    func stopAudio() {
        audioPlayer?.stop()
        isPlayingAudio = false
        currentAudioTime = 0
        timer?.invalidate()
    }
    
    private func startTimer() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            guard let self = self, let player = self.audioPlayer else { return }
            self.currentAudioTime = player.currentTime
        }
    }
    
    // AVAudioPlayerDelegate
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        isPlayingAudio = false
        currentAudioTime = 0
        timer?.invalidate()
    }
    
    func savePhrase(_ text: String, type: String = "vocabulary") async {
        do {
            try await apiService.savePhrase(newsId: newsItem.id, text: text, note: nil, type: type)
            // Could add a success notification here
        } catch {
            print("Failed to save phrase: \(error)")
        }
    }
}

