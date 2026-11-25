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

    private static let wheel: [String: Any] = obj(["hue": number, "amount": number, "luma": number])

    static let colorGrade: [String: Any] = obj([
        "preset": oneOf(ColorPreset.self),
        "presetIntensity": number,
        "exposure": number, "contrast": number,
        "highlights": number, "shadows": number, "whites": number, "blacks": number,
        "temperature": number, "tint": number,
        "saturation": number, "vibrance": number,
        "lift": wheel, "gamma": wheel, "gain": wheel,
        "splitShadows": string, "splitHighlights": string, "splitAmount": number, "splitBalance": number,
        "hsl": array(obj([
            "band": oneOf(HSLBand.self), "hue": number, "saturation": number, "luminance": number,
        ])),
        "fade": number, "clarity": number, "sharpen": number, "grain": number,
        "bloom": number, "halation": number, "vignette": number, "skinProtect": number,
        "lut": string, "lutIntensity": number,
    ])

    static let plan: [String: Any] = obj([
        "title": string,
        "summary": string,
        "format": oneOf(VideoFormat.self),
        "segments": array(obj([
            "kind": oneOf(SegmentKind.self),
            "sourceStart": number,
            "sourceEnd": number,
            "speed": number,
            "speedRamp": oneOf(SpeedRamp.self),
            "focusX": number,
            "focusY": number,
            "sceneDuration": number,
            "sceneTitle": string,
            "sceneSubtitle": string,
            "sceneStyle": oneOf(SceneStyle.self),
            "sceneColors": array(string),
            "transitionIn": obj([
                "type": oneOf(TransitionType.self),
                "duration": number,
            ]),
            "aiPrompt": string,
            "aiCamera": oneOf(CameraMove.self),
            "aiUseFrame": boolean,
            "color": ["anyOf": [colorGrade, ["type": "null"] as [String: Any]] as [[String: Any]]] as [String: Any],
        ])),
        "texts": array(obj([
            "text": string,
            "segmentIndex": integer,
            "startOffset": number,
            "duration": number,
            "x": number, "y": number,
            "font": oneOf(TextFont.self),
            "weight": oneOf(TextWeight.self),
            "size": number,
            "color": string,
            "gradientColor": string,
            "strokeColor": string,
            "strokeWidth": number,
            "shadow": number,
            "glowColor": string,
            "glowAmount": number,
            "background": oneOf(TextBackground.self),
            "backgroundColor": string,
            "uppercase": boolean,
            "letterSpacing": number,
            "align": oneOf(TextAlign.self),
            "rotation": number,
            "maxWidth": number,
            "animationIn": oneOf(TextAnimIn.self),
            "animationOut": oneOf(TextAnimOut.self),
            "loop": oneOf(TextLoop.self),
            "behindSubject": boolean,
        ])),
        "effects": array(obj([
            "type": oneOf(EffectType.self),
            "segmentIndex": integer,
            "startOffset": number,
            "duration": number,
            "intensity": number,
            "focusX": number,
            "focusY": number,
            "color": string,
            "secondaryColor": string,
        ])),
        "color": colorGrade,
        "captions": obj([
            "enabled": boolean,
            "template": oneOf(CaptionTemplate.self),
            "font": oneOf(TextFont.self),
            "color": string,
            "highlightColor": string,
            "y": number,
            "size": number,
            "uppercase": boolean,
            "maxWords": integer,
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
