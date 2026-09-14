import Foundation
import Security

// Private binary protocol: one creation flag byte followed by exactly 32 key
// bytes. Only the Node credential provider may invoke this helper; never log it.
let service = "com.project-d.starcraft-tmg.raw-quarantine"
let account = "raw-quarantine-key-v1"
let args = CommandLine.arguments
func stop(_ code: String) -> Never {
    FileHandle.standardError.write(Data(code.utf8))
    exit(1)
}
guard args.count == 2, ["read", "ensure"].contains(args[1]) else { stop("RAW_KEY_ARGUMENTS_INVALID") }
let base: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrService as String: service,
    kSecAttrAccount as String: account,
    kSecAttrSynchronizable as String: false,
]
func readKey() -> (OSStatus, Data?) {
    var query = base
    query[kSecReturnData as String] = true
    query[kSecMatchLimit as String] = kSecMatchLimitOne
    var result: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    return (status, result as? Data)
}
var (status, data) = readKey()
var created: UInt8 = 0
if status == errSecItemNotFound && args[1] == "ensure" {
    var bytes = [UInt8](repeating: 0, count: 32)
    guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else { stop("RAW_KEY_RANDOM_FAILED") }
    var query = base
    query[kSecValueData as String] = Data(bytes)
    query[kSecAttrLabel as String] = "Project D StarCraft raw quarantine key v1"
    let added = SecItemAdd(query as CFDictionary, nil)
    _ = bytes.withUnsafeMutableBytes { $0.initializeMemory(as: UInt8.self, repeating: 0) }
    guard added == errSecSuccess || added == errSecDuplicateItem else { stop("RAW_KEY_CREATE_FAILED") }
    created = added == errSecSuccess ? 1 : 0
    (status, data) = readKey()
}
guard status == errSecSuccess, var key = data, key.count == 32 else { stop("RAW_KEY_READ_FAILED") }
FileHandle.standardOutput.write(Data([created]))
FileHandle.standardOutput.write(key)
key.resetBytes(in: 0..<key.count)
let originalCount = data?.count ?? 0
data?.resetBytes(in: 0..<originalCount)
