import SwiftUI
import Observation

enum SidebarItem: Hashable, Identifiable, CaseIterable {
    case news
    case library
    case sources
    case settings
    
    var id: Self { self }
    
    var icon: String {
        switch self {
        case .news: return "newspaper"
        case .library: return "books.vertical"
        case .sources: return "antenna.radiowaves.left.and.right"
        case .settings: return "gearshape"
        }
    }
    
    func title(for mode: UserMode) -> String {
        switch self {
        case .news: return "News"
        case .library: return mode == .englishLearner ? "Learning Library" : "Knowledge Base"
        case .sources: return "Sources"
        case .settings: return "Settings"
        }
    }
}

struct ContentView: View {
    @Bindable var viewModel: TaylorSwiftDesignViewModel
    @EnvironmentObject var userPrefs: UserPreferenceStore
    @State private var selectedItem: SidebarItem? = .news
    @State private var columnVisibility = NavigationSplitViewVisibility.doubleColumn

    var body: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
            List(selection: $selectedItem) {
                ForEach(SidebarItem.allCases) { item in
                    NavigationLink(value: item) {
                        Label(item.title(for: userPrefs.currentMode), systemImage: item.icon)
                            .font(AgentFont.body(weight: .medium))
                    }
                    .listRowBackground(selectedItem == item ? AgentColor.card : Color.clear)
                }
            }
            .navigationTitle("Syunjyun")
            .background(AgentColor.background.ignoresSafeArea())
            .scrollContentBackground(.hidden)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        Picker("Mode", selection: $userPrefs.currentMode) {
                            ForEach(UserMode.allCases) { mode in
                                Label(mode.displayName, systemImage: mode.icon)
                                    .tag(mode)
                            }
                        }
                    } label: {
                        Label("Mode", systemImage: userPrefs.currentMode.icon)
                    }
                }
            }
        } detail: {
            NavigationStack {
                switch selectedItem {
                case .news, nil:
                    NewsListView()
                case .library:
                    LearningLibraryView()
                case .sources:
                    SourceManagementView(viewModel: viewModel.sourceManager)
                case .settings:
                    SettingsView()
                }
            }
        }
        .accentColor(AgentColor.accentPrimary)
    }
}

#Preview {
    ContentView(viewModel: TaylorSwiftDesignViewModel())
        .environmentObject(UserPreferenceStore())
}
