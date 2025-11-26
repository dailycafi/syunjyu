import SwiftUI

struct LearningLibraryView: View {
    @EnvironmentObject var userPrefs: UserPreferenceStore
    @State private var searchText = ""
    @State private var savedPhrases: [SavedPhrase] = []
    @State private var isLoading = false
    
    var filteredPhrases: [SavedPhrase] {
        if searchText.isEmpty {
            return savedPhrases
        } else {
            return savedPhrases.filter { $0.text.localizedCaseInsensitiveContains(searchText) || ($0.note?.localizedCaseInsensitiveContains(searchText) ?? false) }
        }
    }
    
    var body: some View {
        NavigationStack {
            List {
                if isLoading && savedPhrases.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, alignment: .center)
                        .listRowBackground(Color.clear)
                } else if savedPhrases.isEmpty {
                    Text("No items saved yet.")
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .listRowBackground(Color.clear)
                        .padding(.top, 40)
                } else {
                    if userPrefs.currentMode == .englishLearner {
                        englishContent
                    } else {
                        aiContent
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search library...")
            .navigationTitle(userPrefs.currentMode == .englishLearner ? "Vocabulary Builder" : "Knowledge Base")
            .background(AgentColor.background)
            .scrollContentBackground(.hidden)
            .task {
                await loadData()
            }
            .refreshable {
                await loadData()
            }
        }
    }
    
    private func loadData() async {
        isLoading = true
        do {
             self.savedPhrases = try await APIService.shared.fetchAllPhrases()
        } catch {
            print("Error loading phrases: \(error)")
        }
        isLoading = false
    }
    
    private var englishContent: some View {
        Section(header: Text("My Vocabulary")) {
            ForEach(filteredPhrases) { item in
                LearningItemRow(item: item, isEnglishMode: true)
            }
        }
    }
    
    private var aiContent: some View {
        Section(header: Text("Saved Insights")) {
            ForEach(filteredPhrases) { item in
                LearningItemRow(item: item, isEnglishMode: false)
            }
        }
    }
}

struct LearningItemRow: View {
    let item: SavedPhrase
    let isEnglishMode: Bool
    @State private var isExpanded: Bool = false
    @State private var practiceSentence: String = ""
    @State private var aiFeedback: String?
    @State private var aiExplanation: String?
    @State private var isChecking: Bool = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button(action: { withAnimation { isExpanded.toggle() } }) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.text)
                            .font(AgentFont.headline())
                            .foregroundStyle(AgentColor.textPrimary)
                            .lineLimit(isExpanded ? nil : 2)
                        
                        if let note = item.note, !note.isEmpty {
                            Text(note)
                                .font(AgentFont.body())
                                .foregroundStyle(AgentColor.textSecondary)
                                .lineLimit(isExpanded ? nil : 2)
                        }
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .rotationEffect(.degrees(isExpanded ? 90 : 0))
                        .foregroundStyle(AgentColor.accentPrimary)
                }
            }
            .buttonStyle(.plain)
            
            if isExpanded {
                Divider()
                
                if isEnglishMode {
                    // English Learner: Definition + Sentence Practice
                    VStack(alignment: .leading, spacing: 12) {
                        
                        // Definition Section
                        VStack(alignment: .leading, spacing: 8) {
                            Button {
                                defineWord()
                            } label: {
                                HStack {
                                    if isChecking && aiExplanation == nil { // Show loading only if no result yet
                                        ProgressView().scaleEffect(0.8)
                                    }
                                    Text(aiExplanation == nil ? "See Definition" : "Definition")
                                        .font(AgentFont.caption(weight: .bold))
                                        .foregroundStyle(AgentColor.accentPrimary)
                                }
                            }
                            .disabled(isChecking)
                            
                            if let definition = aiExplanation {
                                Text(definition)
                                    .font(AgentFont.body())
                                    .foregroundStyle(AgentColor.textPrimary)
                                    .padding(8)
                                    .background(AgentColor.surface)
                                    .cornerRadius(8)
                            }
                        }
                        
                        Divider()
                        
                        // Sentence Practice
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Sentence Practice")
                                .font(AgentFont.caption(weight: .bold))
                                .foregroundStyle(AgentColor.accentPrimary)
                            
                            Text("Use this in a sentence:")
                                .font(AgentFont.caption())
                            
                            TextField("Type your sentence here...", text: $practiceSentence)
                                .textFieldStyle(.roundedBorder)
                                .font(AgentFont.body())
                            
                            Button {
                                checkSentence()
                            } label: {
                                HStack {
                                    if isChecking && aiFeedback == nil {
                                        ProgressView().scaleEffect(0.8)
                                    }
                                    Text("Check with AI")
                                }
                            }
                            .disabled(practiceSentence.isEmpty || isChecking)
                            .font(AgentFont.caption(weight: .bold))
                            .foregroundStyle(AgentColor.accentPrimary)
                            
                            if let feedback = aiFeedback {
                                Text(feedback)
                                    .font(AgentFont.caption())
                                    .foregroundStyle(AgentColor.textPrimary)
                                    .padding(8)
                                    .background(AgentColor.surface)
                                    .cornerRadius(8)
                            }
                        }
                    }
                } else {
                    // AI Learner: Deep Dive / Context
                    VStack(alignment: .leading, spacing: 8) {
                        Button {
                            explainConcept()
                        } label: {
                            HStack {
                                if isChecking {
                                    ProgressView().scaleEffect(0.8)
                                }
                                Text(aiExplanation == nil ? "Explain Concept" : "Refresh Explanation")
                            }
                        }
                        .disabled(isChecking)
                        .font(AgentFont.caption(weight: .bold))
                        .foregroundStyle(AgentColor.accentPrimary)

                        if let explanation = aiExplanation {
                            Text(explanation)
                                .font(AgentFont.caption())
                                .foregroundStyle(AgentColor.textPrimary)
                                .padding(8)
                                .background(AgentColor.surface)
                                .cornerRadius(8)
                        }
                    }
                }
            }
        }
        .padding(.vertical, 8)
    }
    
    private func checkSentence() {
        guard !practiceSentence.isEmpty else { return }
        isChecking = true
        Task {
            do {
                let feedback = try await APIService.shared.checkSentence(term: item.text, sentence: practiceSentence)
                await MainActor.run {
                    self.aiFeedback = feedback
                    self.isChecking = false
                }
            } catch {
                await MainActor.run {
                    self.aiFeedback = "Could not check sentence. Please try again."
                    self.isChecking = false
                }
            }
        }
    }
    
    private func explainConcept() {
        isChecking = true
        Task {
            do {
                let explanation = try await APIService.shared.explainConcept(term: item.text, context: item.note)
                await MainActor.run {
                    self.aiExplanation = explanation
                    self.isChecking = false
                }
            } catch {
                await MainActor.run {
                    self.aiExplanation = "Could not explain concept. Please try again."
                    self.isChecking = false
                }
            }
        }
    }
    
    private func defineWord() {
        isChecking = true
        Task {
            do {
                let definition = try await APIService.shared.defineWord(term: item.text)
                await MainActor.run {
                    self.aiExplanation = definition
                    self.isChecking = false
                }
            } catch {
                 await MainActor.run {
                    self.aiExplanation = "Could not get definition. Please try again."
                    self.isChecking = false
                }
            }
        }
    }
}

// Extension to add fetchAllPhrases to APIService if not present
extension APIService {
    func fetchAllPhrases() async throws -> [SavedPhrase] {
        // We construct the URL without news_id to get all
        let url = URL(string: "http://127.0.0.1:8500/api/phrases")!
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
}

#Preview {
    LearningLibraryView()
        .environmentObject(UserPreferenceStore())
}
