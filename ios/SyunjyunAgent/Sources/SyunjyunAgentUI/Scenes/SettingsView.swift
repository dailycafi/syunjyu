import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var userPrefs: UserPreferenceStore
    
    var body: some View {
        Form {
            providerSection
            
            if userPrefs.modelProvider == "remote" {
                remoteConfigSection
            } else {
                localConfigSection
            }
            
            backendConnectionSection
        }
        .scrollContentBackground(.hidden)
        .background(AgentColor.background.ignoresSafeArea())
        .navigationTitle("设置")
        .onChange(of: userPrefs.modelProvider) { _, newValue in
            syncSetting("model_provider", value: newValue)
        }
        .onChange(of: userPrefs.localModelBaseUrl) { _, newValue in
            syncSetting("local_model_base_url", value: newValue)
        }
        .onChange(of: userPrefs.localModelName) { _, newValue in
            syncSetting("local_model_name", value: newValue)
        }
    }
    
    private func syncSetting(_ key: String, value: String) {
        Task {
            try? await APIService.shared.updateSetting(key: key, value: value)
        }
    }
    
    private var providerSection: some View {
        Section {
            Picker("AI 模型来源", selection: $userPrefs.modelProvider) {
                Text("Local").tag("local")
                Text("Remote").tag("remote")
            }
            .pickerStyle(.menu)
            .listRowBackground(AgentColor.card)
        } header: {
            Text("模型配置")
                .font(AgentFont.caption())
                .foregroundStyle(AgentColor.textSecondary)
        }
    }
    
    private var remoteConfigSection: some View {
        Section {
            Picker("提供商", selection: $userPrefs.remoteProvider) {
                Text("MINIMAX").tag("MINIMAX")
            }
            .pickerStyle(.menu)
            .listRowBackground(AgentColor.card)
            
            HStack {
                Text("API Key")
                    .foregroundStyle(AgentColor.textPrimary)
                Spacer()
                Text("sk-••••••••••••")
                    .foregroundStyle(AgentColor.textSecondary)
            }
            .listRowBackground(AgentColor.card)
            .overlay(alignment: .trailing) {
                // Disable interaction visually and functionally
                Rectangle()
                    .fill(Color.clear)
                    .contentShape(Rectangle())
            }
        } header: {
            Text("远程服务设置")
                .font(AgentFont.caption())
                .foregroundStyle(AgentColor.textSecondary)
        } footer: {
            Text("目前仅支持 MINIMAX 模型，演示版本使用内置 Key，暂不支持修改。")
                .font(AgentFont.caption())
                .foregroundStyle(AgentColor.textSecondary)
        }
    }
    
    private var localConfigSection: some View {
        Section {
            Picker("Model Name", selection: $userPrefs.localModelName) {
                Text("gpt-oss-20B").tag("gpt-oss-20B")
                Text("Qwen 3 (14B)").tag("Qwen 3 14B")
            }
            .pickerStyle(.menu)
            .listRowBackground(AgentColor.card)
            
            VStack(alignment: .leading, spacing: 8) {
                Text("Base URL")
                    .font(AgentFont.caption())
                    .foregroundStyle(AgentColor.textSecondary)
                TextField("http://127.0.0.1:1234/v1", text: $userPrefs.localModelBaseUrl)
                    .font(.system(.body, design: .rounded))
                    .foregroundStyle(AgentColor.textPrimary)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
            }
            .padding(.vertical, 4)
            .listRowBackground(AgentColor.card)
            
        } header: {
            Text("本地服务设置")
                .font(AgentFont.caption())
                .foregroundStyle(AgentColor.textSecondary)
        } footer: {
            Text("兼容 OpenAI 接口的本地服务 (如 LM Studio, Ollama)。\n默认端口: LM Studio (1234), Ollama (11434)")
                .font(AgentFont.caption())
                .foregroundStyle(AgentColor.textSecondary)
        }
    }
    
    private var backendConnectionSection: some View {
        Section {
            HStack {
                Text("Host")
                    .foregroundStyle(AgentColor.textPrimary)
                Spacer()
                TextField("127.0.0.1", text: $userPrefs.localHost)
                    .multilineTextAlignment(.trailing)
                    .foregroundStyle(AgentColor.textSecondary)
                    .font(.system(.body, design: .rounded))
            }
            .listRowBackground(AgentColor.card)
            
            HStack {
                Text("Port")
                    .foregroundStyle(AgentColor.textPrimary)
                Spacer()
                TextField("8500", text: $userPrefs.localPort)
                    .multilineTextAlignment(.trailing)
                    .keyboardType(.numberPad)
                    .foregroundStyle(AgentColor.textSecondary)
                    .font(.system(.body, design: .rounded))
            }
            .listRowBackground(AgentColor.card)
            
        } header: {
            Text("Python 后端连接")
                .font(AgentFont.caption())
                .foregroundStyle(AgentColor.textSecondary)
        } footer: {
            Text("Syunjyun Agent 后端服务的地址和端口。")
                .font(AgentFont.caption())
                .foregroundStyle(AgentColor.textSecondary)
        }
    }
}

#Preview {
    NavigationStack {
        SettingsView()
            .environmentObject(UserPreferenceStore())
    }
}
