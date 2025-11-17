import Foundation

final class SourcePreferenceStore {
    private let defaults: UserDefaults
    private let disabledKey = "syunjyun.source.disabled.ids"

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    func loadDisabledIDs() -> Set<Int> {
        guard
            let data = defaults.data(forKey: disabledKey),
            let decoded = try? JSONDecoder().decode(Set<Int>.self, from: data)
        else {
            return []
        }
        return decoded
    }

    func save(disabledIDs: Set<Int>) {
        guard let data = try? JSONEncoder().encode(disabledIDs) else {
            return
        }
        defaults.set(data, forKey: disabledKey)
    }
}

