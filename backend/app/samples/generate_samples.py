import os
from pathlib import Path
import numpy as np
import cv2

SAMPLES_DIR = Path(__file__).resolve().parent

def create_base_weld_plate(width=720, height=480, plate_color=160, bead_color=195):
    """Generates a realistic metallic plate with a central horizontal laser weld bead."""
    # Base brushed metal texture with gaussian noise
    img = np.full((height, width), plate_color, dtype=np.uint8)
    noise = np.random.normal(0, 7, (height, width)).astype(np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    # Horizontal brushing streaks
    brush = cv2.GaussianBlur(img, (25, 1), 0)
    img = cv2.addWeighted(img, 0.6, brush, 0.4, 0)

    # Heat Affected Zone (HAZ) - darker thermal oxidation bands above and below seam
    center_y = height // 2
    haz_half_width = 45
    for y in range(center_y - haz_half_width, center_y + haz_half_width):
        dist = abs(y - center_y)
        if dist > 20: # HAZ region
            factor = 1.0 - (0.22 * (1.0 - (dist - 20) / (haz_half_width - 20)))
            img[y, :] = np.clip(img[y, :].astype(np.float32) * factor, 0, 255).astype(np.uint8)

    # Laser Weld Seam Bead (centerline ~40px wide) with fine solidification chevron ripples
    bead_half = 20
    for y in range(center_y - bead_half, center_y + bead_half):
        dist = abs(y - center_y)
        profile_factor = np.cos((dist / bead_half) * (np.pi / 2.0))
        img[y, :] = np.clip(img[y, :].astype(np.float32) + (bead_color - plate_color) * profile_factor, 0, 255).astype(np.uint8)

    # Add solidification ripples (V-shaped or chevron curves)
    for x in range(20, width - 20, 18):
        pts = np.array([
            [x, center_y - bead_half + 4],
            [x + 10, center_y],
            [x, center_y + bead_half - 4]
        ], np.int32).reshape((-1, 1, 2))
        cv2.polylines(img, [pts], False, int(plate_color * 0.82), 1, cv2.LINE_AA)

    # Convert to 3-channel BGR with subtle thermal temper tint (straw / golden oxide)
    bgr = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    # subtle yellow-gold hue on HAZ
    haz_mask = np.zeros((height, width), dtype=np.uint8)
    haz_mask[center_y - haz_half_width : center_y + haz_half_width, :] = 255
    bgr[:, :, 0] = np.where(haz_mask > 0, np.clip(bgr[:, :, 0].astype(np.int16) - 12, 0, 255), bgr[:, :, 0]).astype(np.uint8) # less blue
    bgr[:, :, 2] = np.where(haz_mask > 0, np.clip(bgr[:, :, 2].astype(np.int16) + 15, 0, 255), bgr[:, :, 2]).astype(np.uint8) # more red

    return bgr

def generate_sample_porosity():
    """Generates weld specimen with distinct circular gas porosity clusters."""
    bgr = create_base_weld_plate()
    h, w = bgr.shape[:2]
    center_y = h // 2

    # Cluster of gas pores
    pore_centers = [
        (w // 2 - 80, center_y - 4, 7),
        (w // 2 - 62, center_y + 6, 9),
        (w // 2 - 40, center_y - 2, 6),
        (w // 2 - 15, center_y + 8, 8),
        (w // 2 + 10, center_y - 6, 10),
        (w // 2 + 45, center_y + 2, 7),
        (w // 2 + 75, center_y - 5, 8),
        (w // 2 + 95, center_y + 7, 6),
    ]

    for (px, py, r) in pore_centers:
        # Dark void interior
        cv2.circle(bgr, (px, py), r, (22, 22, 22), -1, cv2.LINE_AA)
        # Inner shadow
        cv2.circle(bgr, (px, py), max(2, r - 2), (8, 8, 8), -1, cv2.LINE_AA)
        # Specular bright crescent edge from directional lighting
        cv2.ellipse(bgr, (px, py), (r, r), 0, 180, 360, (230, 230, 240), 1, cv2.LINE_AA)

    return bgr

def generate_sample_crack():
    """Generates weld specimen with longitudinal centerline solidification crack."""
    bgr = create_base_weld_plate()
    h, w = bgr.shape[:2]
    center_y = h // 2

    # Jagged crack path with branches
    crack_pts = []
    curr_x = w // 2 - 140
    curr_y = center_y - 2
    crack_pts.append((curr_x, curr_y))

    np.random.seed(42)
    while curr_x < w // 2 + 150:
        step_x = np.random.randint(12, 26)
        step_y = np.random.randint(-4, 5)
        curr_x += step_x
        curr_y = np.clip(curr_y + step_y, center_y - 8, center_y + 8)
        crack_pts.append((curr_x, curr_y))

    # Draw main crack line
    for i in range(len(crack_pts) - 1):
        pt1 = crack_pts[i]
        pt2 = crack_pts[i + 1]
        cv2.line(bgr, pt1, pt2, (15, 15, 15), 3, cv2.LINE_AA)
        cv2.line(bgr, pt1, pt2, (0, 0, 0), 2, cv2.LINE_AA)
        # High-stress bright fringe along crack lip
        cv2.line(bgr, (pt1[0], pt1[1] - 1), (pt2[0], pt2[1] - 1), (220, 220, 225), 1, cv2.LINE_AA)

    # Branch crack
    branch_start = crack_pts[len(crack_pts) // 2]
    cv2.line(bgr, branch_start, (branch_start[0] + 30, branch_start[1] + 12), (10, 10, 10), 2, cv2.LINE_AA)
    cv2.line(bgr, (branch_start[0] + 30, branch_start[1] + 12), (branch_start[0] + 55, branch_start[1] + 16), (20, 20, 20), 1, cv2.LINE_AA)

    return bgr

def generate_sample_burnthrough():
    """Generates weld specimen with severe melt-through hole void."""
    bgr = create_base_weld_plate()
    h, w = bgr.shape[:2]
    center_y = h // 2

    # Melt-through hole
    hole_center = (w // 2, center_y)
    # Irregular molten cavity
    cv2.ellipse(bgr, hole_center, (36, 18), 5, 0, 360, (10, 10, 10), -1, cv2.LINE_AA)
    cv2.ellipse(bgr, hole_center, (28, 14), 5, 0, 360, (2, 2, 2), -1, cv2.LINE_AA)
    
    # Molten sag lip rim around the hole
    cv2.ellipse(bgr, hole_center, (40, 22), 5, 0, 360, (75, 75, 80), 2, cv2.LINE_AA)
    cv2.ellipse(bgr, (hole_center[0] + 2, hole_center[1] + 2), (43, 24), 5, 0, 180, (230, 230, 235), 1, cv2.LINE_AA)

    return bgr

def generate_sample_incomplete_penetration():
    """Generates weld specimen with lack of root fusion joint line."""
    bgr = create_base_weld_plate()
    h, w = bgr.shape[:2]
    center_y = h // 2

    # Continuous narrow un-fused seam groove
    start_x = w // 2 - 160
    end_x = w // 2 + 160
    cv2.line(bgr, (start_x, center_y), (end_x, center_y), (25, 25, 25), 4, cv2.LINE_AA)
    cv2.line(bgr, (start_x, center_y), (end_x, center_y), (10, 10, 10), 2, cv2.LINE_AA)
    # Groove shadow edge
    cv2.line(bgr, (start_x, center_y + 2), (end_x, center_y + 2), (210, 210, 215), 1, cv2.LINE_AA)

    return bgr

def generate_sample_good_weld():
    """Generates pristine laser weld with zero defects and clean ripples."""
    return create_base_weld_plate(width=720, height=480, plate_color=165, bead_color=205)

def generate_sample_video(output_path: str, duration_sec: int = 3, fps: int = 25):
    """Generates a 3-second traveling scan video traversing across a laser weld."""
    width, height = 640, 360
    total_frames = duration_sec * fps

    # Full panoramic seam width
    pan_w = width + 400
    pan_img = create_base_weld_plate(width=pan_w, height=height)

    # Introduce a defect in the middle section of the panorama
    center_y = height // 2
    # Porosity cluster around x = 520
    for px, py, r in [(500, center_y - 4, 7), (520, center_y + 5, 8), (540, center_y - 2, 6)]:
        cv2.circle(pan_img, (px, py), r, (15, 15, 15), -1, cv2.LINE_AA)
        cv2.circle(pan_img, (px, py), max(2, r - 2), (2, 2, 2), -1, cv2.LINE_AA)
        cv2.ellipse(pan_img, (px, py), (r, r), 0, 180, 360, (230, 230, 240), 1, cv2.LINE_AA)

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    for f in range(total_frames):
        # Pan from x = 0 to x = 380
        start_x = int((f / total_frames) * (pan_w - width))
        frame = pan_img[:, start_x : start_x + width]
        
        # Add subtle scanner crosshair HUD line
        frame_hud = frame.copy()
        cv2.line(frame_hud, (width // 2, 0), (width // 2, height), (0, 255, 255), 1, cv2.LINE_AA)
        cv2.line(frame_hud, (0, height // 2), (width, height // 2), (0, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(frame_hud, f"OPTICAL SCANNER FEED | FRAME {f:03d}", (15, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1, cv2.LINE_AA)
        
        out.write(frame_hud)

    out.release()

def generate_all_samples():
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    
    samples = {
        "sample_porosity.jpg": generate_sample_porosity(),
        "sample_crack.jpg": generate_sample_crack(),
        "sample_burnthrough.jpg": generate_sample_burnthrough(),
        "sample_incomplete_penetration.jpg": generate_sample_incomplete_penetration(),
        "sample_good_weld.jpg": generate_sample_good_weld(),
    }

    for name, img in samples.items():
        file_path = SAMPLES_DIR / name
        cv2.imwrite(str(file_path), img)
        print(f"Generated sample image: {file_path}")

    # Video sample
    vid_path = SAMPLES_DIR / "sample_weld_scan.mp4"
    generate_sample_video(str(vid_path))
    print(f"Generated sample video: {vid_path}")

if __name__ == "__main__":
    generate_all_samples()
