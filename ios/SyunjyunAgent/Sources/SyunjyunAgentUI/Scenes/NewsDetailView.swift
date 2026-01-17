import SwiftUI

struct NewsDetailView: View {
    let newsItem: NewsItem
    @State private var viewModel: ArticleDetailViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var showSavePhraseSheet = false
    @State private var selectedTextToSave: String = ""
    
    init(newsItem: NewsItem) {
        self.newsItem = newsItem
        self._viewModel = State(initialValue: ArticleDetailViewModel(newsItem: newsItem))
    }
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading) {
                            Text(newsItem.source)
                                .font(AgentFont.headline())
                                .foregroundStyle(AgentColor.accentPrimary)
                        }
                        
                        Spacer()
                        
                        // Play Button
                        Button {
                            Task {
                                await viewModel.toggleAudio()
                            }
                        } label: {
                            if viewModel.isGeneratingAudio {
                                ProgressView()
                                    .controlSize(.small)
                            } else {
                                Image(systemName: viewModel.isPlayingAudio ? "stop.circle.fill" : "speaker.wave.2.circle.fill")
                                    .font(.system(size: 36))
                                    .foregroundStyle(AgentColor.accentPrimary)
                                    .symbolEffect(.bounce, value: viewModel.isPlayingAudio)
                            }
                        }
                        .disabled(viewModel.isGeneratingAudio)
                    }
                    
                    Text(newsItem.title)
                        .font(AgentFont.largeTitle(weight: .bold))
                        .foregroundStyle(AgentColor.textPrimary)
                    
                    Text(newsItem.date)
                        .font(AgentFont.caption())
                        .foregroundStyle(AgentColor.textSecondary)
                }
                
                Divider()
                
                if let audioError = viewModel.audioError {
                    Text(audioError)
                        .font(AgentFont.caption())
                        .foregroundStyle(.red)
                        .padding(.bottom, 8)
                }
                
                // Audio Progress Bar (Visible when playing)
                if viewModel.isPlayingAudio || viewModel.audioPlayer != nil {
                    VStack(spacing: 4) {
                        ProgressView(value: viewModel.currentAudioTime, total: viewModel.audioDuration)
                            .tint(AgentColor.accentPrimary)
                        
                        HStack {
                            Text(formatTime(viewModel.currentAudioTime))
                            Spacer()
                            Text(formatTime(viewModel.audioDuration))
                        }
                        .font(AgentFont.caption())
                        .foregroundStyle(AgentColor.textSecondary)
                    }
                    .padding(.bottom, 8)
                    .transition(.move(edge: .top).combined(with: .opacity))
                }
                
                // Full Text
                VStack(alignment: .leading, spacing: 16) {
                    Text("Article Content")
                        .font(AgentFont.headline())
                        .foregroundStyle(AgentColor.textSecondary)
                    
                    if let content = newsItem.contentRaw, !content.isEmpty {
                        // Highlighted Text Rendering would go here
                        // For simplicity in SwiftUI, we might just show the text.
                        // Ideally we'd break it down if we had word-level timestamps.
                        SelectableTextView(text: content) { selectedText in
                            Task {
                                await viewModel.savePhrase(selectedText, type: "content")
                            }
                        }
                        .frame(minHeight: 100)
                        .fixedSize(horizontal: false, vertical: true)
                    } else {
                        Text(newsItem.summary)
                            .font(AgentFont.body())
                            .foregroundStyle(AgentColor.textPrimary)
                            .lineSpacing(6)
                            .textSelection(.enabled)
                        
                        Text("Full content not available. Showing summary.")
                            .font(AgentFont.caption())
                            .foregroundStyle(.secondary)
                            .padding(.top)
                    }
                }
                
                // AI Analysis Section
                if let analysis = viewModel.analysis {
                    AnalysisView(analysis: analysis)
                } else if viewModel.isAnalyzing {
                    HStack {
                        ProgressView()
                        Text("Analyzing with AI...")
                            .font(AgentFont.body())
                            .foregroundStyle(AgentColor.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding()
                } else {
                    Button {
                        Task { await viewModel.analyze() }
                    } label: {
                        HStack {
                            Image(systemName: "sparkles")
                            Text("Analyze Article")
                        }
                        .font(AgentFont.body(weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            Capsule()
                                .fill(AgentColor.accentPrimary)
                        )
                    }
                }
                
                if let error = viewModel.analysisError {
                    Text(error)
                        .font(AgentFont.caption())
                        .foregroundStyle(.red)
                }
                
                // Footer Status
                HStack {
                    HStack(spacing: 4) {
                        Circle().fill(Color.green).frame(width: 8, height: 8)
                        Text("API Mode")
                    }
                    Spacer()
                    Text("Model: MiniMax")
                }
                .font(AgentFont.caption())
                .foregroundStyle(AgentColor.textSecondary)
                .padding(.top, 20)
                
                Button(action: {
                    dismiss()
                }) {
                    Text("返回列表")
                        .font(AgentFont.body(weight: .semibold))
                        .foregroundStyle(AgentColor.accentPrimary)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(AgentColor.accentPrimary, lineWidth: 1)
                        )
                }
                .padding(.top, 24)
            }
            .padding(20)
        }
        .background(AgentColor.background.ignoresSafeArea())
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button(action: {
                    showSavePhraseSheet = true
                }) {
                    Image(systemName: "bookmark")
                }
            }
        }
        .sheet(isPresented: $showSavePhraseSheet) {
            SavePhraseView(viewModel: viewModel)
        }
        .onDisappear {
            viewModel.stopAudio()
        }
    }
    
    private func formatTime(_ time: TimeInterval) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

struct SelectableTextView: UIViewRepresentable {
    let text: String
    let onSave: (String) -> Void

    func makeUIView(context: Context) -> UITextView {
        let textView = UITextView()
        textView.isEditable = false
        textView.isSelectable = true
        textView.backgroundColor = .clear
        
        // Font styling to match AgentFont.body (rounded)
        if let descriptor = UIFont.preferredFont(forTextStyle: .body).fontDescriptor.withDesign(.rounded) {
            textView.font = UIFont(descriptor: descriptor, size: 0)
        } else {
            textView.font = .preferredFont(forTextStyle: .body)
        }
        
        textView.textColor = UIColor(named: "TextPrimary") ?? .label
        textView.textContainer.lineFragmentPadding = 0
        textView.textContainerInset = .zero
        textView.isScrollEnabled = false // Let SwiftUI handle scrolling
        
        textView.delegate = context.coordinator
        return textView
    }

    func updateUIView(_ uiView: UITextView, context: Context) {
        uiView.text = text
        // Update color if needed (e.g. dark mode change)
        uiView.textColor = UIColor(named: "TextPrimary") ?? .label
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, UITextViewDelegate {
        var parent: SelectableTextView

        init(_ parent: SelectableTextView) {
            self.parent = parent
        }

        // iOS 16+ Edit Menu Customization
        func textView(_ textView: UITextView, editMenuForTextIn range: NSRange, suggestedActions: [UIMenuElement]) -> UIMenu? {
            let saveAction = UIAction(title: "Save to Library", image: UIImage(systemName: "bookmark")) { _ in
                if let textRange = textView.textRange(from: textView.position(from: textView.beginningOfDocument, offset: range.location)!, to: textView.position(from: textView.beginningOfDocument, offset: range.location + range.length)!) {
                    if let selectedText = textView.text(in: textRange) {
                        self.parent.onSave(selectedText)
                    }
                }
            }
            
            var actions = suggestedActions
            actions.insert(saveAction, at: 0)
            
            return UIMenu(children: actions)
        }
    }
}

    let analysis: ArticleAnalysis
    @EnvironmentObject var userPrefs: UserPreferenceStore
    
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("AI Analysis")
                .font(AgentFont.title(weight: .bold))
            
            // Conditional Order based on User Mode
            if userPrefs.currentMode == .englishLearner {
                vocabularySection
                summarySection
                structureSection
            } else {
                summarySection
                structureSection
                // AI Learners might not need vocabulary, or maybe just at the end
            }
        }
    }
    
    private var summarySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Summary", systemImage: "text.alignleft")
                .font(AgentFont.headline())
                .foregroundStyle(AgentColor.accentPrimary)
            Text(analysis.summary)
                .font(AgentFont.body())
        }
        .padding()
        .background(AgentColor.surface)
        .cornerRadius(12)
    }
    
    private var structureSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(userPrefs.currentMode == .englishLearner ? "Structure" : "Key Insights", systemImage: "list.bullet")
                .font(AgentFont.headline())
                .foregroundStyle(AgentColor.accentPrimary)
            
            ForEach(analysis.structure) { item in
                HStack(alignment: .top) {
                    Text("•")
                    VStack(alignment: .leading) {
                        Text(item.section)
                            .font(AgentFont.body(weight: .bold))
                        Text(item.description)
                            .font(AgentFont.caption())
                            .foregroundStyle(AgentColor.textSecondary)
                    }
                }
                .padding(.bottom, 4)
            }
        }
        .padding()
        .background(AgentColor.surface)
        .cornerRadius(12)
    }
    
    private var vocabularySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Vocabulary", systemImage: "book.closed")
                .font(AgentFont.headline())
                .foregroundStyle(AgentColor.accentPrimary)
            
            ForEach(analysis.vocabulary) { item in
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.term)
                        .font(AgentFont.body(weight: .bold))
                        .foregroundStyle(AgentColor.textPrimary)
                    
                    Text(item.definition)
                        .font(AgentFont.body())
                    
                    Text("\"\(item.example)\"")
                        .font(AgentFont.caption(weight: .medium))
                        .foregroundStyle(AgentColor.textSecondary)
                        .italic()
                }
                .padding(.bottom, 8)
                Divider()
            }
        }
        .padding()
        .background(AgentColor.surface)
        .cornerRadius(12)
    }
}

struct SavePhraseView: View {
    var viewModel: ArticleDetailViewModel
    @Environment(\.dismiss) var dismiss
    @State private var text: String = ""
    @State private var note: String = ""
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Phrase or Sentence") {
                    TextEditor(text: $text)
                        .frame(height: 100)
                }
                
                Section("Note (Optional)") {
                    TextField("Add a note...", text: $note)
                }
            }
            .navigationTitle("Save to Library")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task {
                            await viewModel.savePhrase(text)
                            dismiss()
                        }
                    }
                    .disabled(text.isEmpty)
                }
            }
        }
    }
}
