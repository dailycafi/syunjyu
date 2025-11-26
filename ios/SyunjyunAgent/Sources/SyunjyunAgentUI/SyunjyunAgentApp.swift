import SwiftUI
import Observation

@main
struct SyunjyunAgentApp: App {
    @State private var viewModel = TaylorSwiftDesignViewModel()
    @StateObject private var userPreferences = UserPreferenceStore()

    var body: some Scene {
        WindowGroup {
            // Assuming the user wants the NewsListView as the main entry based on the request context
            // If ContentView is the current entry, we might need to wrap it or the user handles navigation elsewhere.
            // For now, I'll inject the environment object so it's available everywhere.
            ContentView(viewModel: viewModel)
                .environmentObject(userPreferences)
                .tint(Color("SunsetRose"))
                .preferredColorScheme(.light)
        }
    }
}
