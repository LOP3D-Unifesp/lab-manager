import { describe, expect, it } from "vitest";

import { clampOffset, clampZoom, distanceBetween, neighborIndex, stepZoom } from "./photoZoom";

describe("zoom", () => {
  it("limita o zoom entre 1x e 6x", () => {
    expect(clampZoom(0.2)).toBe(1);
    expect(clampZoom(3)).toBe(3);
    expect(clampZoom(20)).toBe(6);
  });

  it("anda de 25% em 25% sem passar dos limites", () => {
    expect(stepZoom(1, 1)).toBe(1.25);
    expect(stepZoom(1, -1)).toBe(1);
    expect(stepZoom(5.9, 1)).toBe(6);
  });
});

describe("arrastar", () => {
  const image = { width: 800, height: 600 };
  const container = { width: 1000, height: 700 };

  it("mantém a foto centralizada quando ela cabe na área", () => {
    expect(clampOffset({ x: 120, y: -50 }, 1, image, container)).toEqual({ x: 0, y: 0 });
  });

  it("permite arrastar só até a borda da foto ampliada", () => {
    // 800 * 3 = 2400 de largura: (2400 - 1000) / 2 = 700 de folga; 600 * 3 = 1800: (1800 - 700) / 2 = 550.
    expect(clampOffset({ x: 5000, y: -5000 }, 3, image, container)).toEqual({ x: 700, y: -550 });
    expect(clampOffset({ x: 100, y: 20 }, 3, image, container)).toEqual({ x: 100, y: 20 });
  });
});

describe("pinça e navegação", () => {
  it("mede a distância entre dois dedos", () => {
    expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("vai para a foto vizinha sem passar das pontas", () => {
    expect(neighborIndex(0, 3, -1)).toBe(0);
    expect(neighborIndex(1, 3, 1)).toBe(2);
    expect(neighborIndex(2, 3, 1)).toBe(2);
  });
});
