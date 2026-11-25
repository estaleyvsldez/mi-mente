import Foundation

/// JSON Schema que obliga a Claude a responder exactamente con un EditPlan válido
/// (structured outputs: output_config.format).
enum PlanSchema {
    private static func obj(_ props: [String: Any]) -> [String: Any] {
        ["type": "object",
         "properties": props,
         "required": props.keys.sorted(),
         "additionalProperties": false]
    }
    private static let string: [String: Any] = ["type": "string"]
    private static let number: [String: Any] = ["type": "number"]
    private static let integer: [String: Any] = ["type": "integer"]
    private static let boolean: [String: Any] = ["type": "boolean"]
    private static func oneOf<T: CaseIterable & RawRepresentable>(_: T.Type) -> [String: Any] where T.RawValue == String {
        ["type": "string", "enum": T.allCases.map(\.rawValue)]
    }
    private static func array(_ items: [String: Any]) -> [String: Any] { ["type": "array", "items": items] }

    static let plan: [String: Any] = obj([
        "title": string,
        "summary": string,
        "segments": array(obj([
            "kind": oneOf(SegmentKind.self),
            "sourceStart": number,
            "sourceEnd": number,
            "speed": number,
            "sceneDuration": number,
            "sceneTitle": string,
            "sceneSubtitle": string,
            "sceneStyle": oneOf(SceneStyle.self),
            "sceneColors": array(string),
            "transitionIn": obj([
                "type": oneOf(TransitionType.self),
                "duration": number,
            ]),
        ])),
        "texts": array(obj([
            "text": string,
            "segmentIndex": integer,
            "startOffset": number,
            "duration": number,
            "position": oneOf(TextPosition.self),
            "style": oneOf(TextStyle.self),
            "size": oneOf(TextSize.self),
            "color": string,
            "animation": oneOf(TextAnimation.self),
        ])),
        "color": obj([
            "preset": oneOf(ColorPreset.self),
            "exposure": number,
            "contrast": number,
            "saturation": number,
            "temperature": number,
            "vignette": number,
        ]),
        "captions": obj([
            "enabled": boolean,
            "style": oneOf(TextStyle.self),
            "position": oneOf(TextPosition.self),
            "color": string,
        ]),
        "audio": obj([
            "originalVolume": number,
            "fadeInOut": boolean,
        ]),
    ])

    /// Respuesta completa: un mensaje corto para el usuario + el plan entero.
    static let response: [String: Any] = obj([
        "reply": string,
        "plan": plan,
    ])
}

struct DirectorResponse: Codable {
    var reply: String
    var plan: EditPlan
}
