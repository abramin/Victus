/**
 * GLSL shaders for three-custom-shader-material (CSM).
 *
 * CSM hooks into MeshStandardMaterial, so skinning, lighting, and base
 * textures are preserved automatically. We only modify csm_DiffuseColor
 * to blend fatigue highlighting on top.
 */

export const vertexShader = /* glsl */ `
  attribute float aRegionIndex;
  varying float vRegionIndex;

  void main() {
    vRegionIndex = aRegionIndex;
  }
`;

export const fragmentShader = /* glsl */ `
  uniform float uFatigueValues[15];  // 0.0-1.0 per muscle region
  uniform vec3  uFatigueColors[15];  // RGB from colorSystem.getMuscleColor()
  uniform float uHighlightRegion;    // region index to highlight (-1 = none)
  uniform float uTime;               // elapsed seconds for animation

  varying float vRegionIndex;

  void main() {
    int regionIdx = int(vRegionIndex + 0.5);

    // Unmapped vertices (head, hands, feet) - keep base material
    if (regionIdx < 0 || regionIdx > 14) return;

    float fatigue = uFatigueValues[regionIdx];
    vec3 fatigueColor = uFatigueColors[regionIdx];

    // Two-phase blend curve: subtle below 40%, aggressive ramp above
    float blendStrength;
    if (fatigue < 0.4) {
      blendStrength = fatigue * 0.4;
    } else {
      float t = (fatigue - 0.4) / 0.6;
      blendStrength = 0.16 + smoothstep(0.0, 1.0, t) * 0.74;
    }

    // Desaturate clothing texture at high fatigue so color pops
    if (fatigue > 0.5) {
      float desatAmount = smoothstep(0.5, 0.8, fatigue) * 0.6;
      float lum = dot(csm_DiffuseColor.rgb, vec3(0.299, 0.587, 0.114));
      csm_DiffuseColor.rgb = mix(csm_DiffuseColor.rgb, vec3(lum), desatAmount);
    }

    // Pulse for fatigued muscles (>60%)
    if (fatigue > 0.6) {
      float pulseSpeed = mix(2.0, 1.0, (fatigue - 0.6) / 0.4);
      float pulse = sin(uTime * 3.14159 / pulseSpeed) * 0.5 + 0.5;
      blendStrength += pulse * 0.1;
    }

    // Hover/selection highlight boost
    if (abs(float(regionIdx) - uHighlightRegion) < 0.5) {
      blendStrength = min(blendStrength + 0.3, 0.9);
    }

    // Mix base diffuse with fatigue color
    csm_DiffuseColor = vec4(
      mix(csm_DiffuseColor.rgb, fatigueColor, blendStrength),
      csm_DiffuseColor.a
    );
  }
`;
