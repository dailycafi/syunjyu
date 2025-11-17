import SwiftUI
import Observation

@main
struct SyunjyunAgentApp: App {
    @State private var viewModel = TaylorSwiftDesignViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView(viewModel: viewModel)
                .tint(Color("SunsetRose"))
                .preferredColorScheme(.light)
        }
    }
}
