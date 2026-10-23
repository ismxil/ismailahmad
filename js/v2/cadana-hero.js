/**
 * Cadana hero — the logo construction drawn as a reveal.
 *
 * The grid lines draw in first, the mark is traced along its outline, then
 * a clockwise sweep fills it. Inline (not an <img>) so the animation
 * restarts every time the case renders. Reduced motion shows the final frame.
 */

const GUIDES = [
    // Grid: horizontals, verticals, diagonals
    'M346.738 353.235H1252.52',
    'M346.738 450.331H1252.52',
    'M346.738 547.428H1252.52',
    'M701.426 -2.611V903.174',
    'M799.359 -2.611V903.174',
    'M897.297 -2.611V903.174',
    'M346.738 903.174L1252.53 -2.614',
    'M1252.53 903.174L346.738 -2.614',
    // Keylines: outer circle, the two rounded rectangles
    'M1100.87 450.284C1100.87 616.654 966.002 751.521 799.633 751.521C633.264 751.521 498.395 616.654 498.395 450.284C498.395 283.915 633.264 149.047 799.633 149.047C966.002 149.047 1100.87 283.915 1100.87 450.284Z',
    'M1007.33 751.521H591.928C580.029 751.521 570.383 741.875 570.383 729.974V170.592C570.383 158.691 580.029 149.045 591.928 149.045H1007.33C1019.23 149.045 1028.87 158.691 1028.87 170.592V729.974C1028.87 741.875 1019.23 751.521 1007.33 751.521Z',
    'M1078.91 679.529H520.353C508.226 679.529 498.395 669.692 498.395 657.562V242.756C498.395 230.624 508.226 220.787 520.353 220.787H1078.91C1091.04 220.787 1100.87 230.624 1100.87 242.756V657.562C1100.87 669.692 1091.04 679.529 1078.91 679.529Z',
    // Inner circles
    'M962.841 450.281C962.841 540.416 889.769 613.487 799.634 613.487C709.497 613.487 636.426 540.416 636.426 450.281C636.426 360.144 709.497 287.074 799.634 287.074C889.769 287.074 962.841 360.144 962.841 450.281Z',
    'M897.875 450.281C897.875 492.261 863.845 526.292 821.863 526.292C779.882 526.292 745.852 492.261 745.852 450.281C745.852 408.302 779.882 374.268 821.863 374.268C863.845 374.268 897.875 408.302 897.875 450.281Z',
    'M854.298 450.281C854.298 468.192 839.777 482.714 821.865 482.714C803.951 482.714 789.43 468.192 789.43 450.281C789.43 432.367 803.951 417.848 821.865 417.848C839.777 417.848 854.298 432.367 854.298 450.281Z',
];

// The source mark is one path with a hairline bridge between the "c" and the
// inner dot; split into two closed shapes so the traced outline stays clean.
const MARK = [
    'M959.841 483.864H1027.44C1028.32 483.864 1029 484.649 1028.86 485.513C1011.81 595.382 916.297 679.529 800.964 679.529C673.606 679.529 570.367 576.851 570.367 450.185C570.367 323.465 673.606 220.787 800.964 220.787C916.299 220.787 1011.81 304.883 1028.86 414.803C1029 415.667 1028.32 416.453 1027.44 416.453H960.939C960.291 416.453 959.734 416.012 959.575 415.386C944.023 354.077 888.217 308.744 821.783 308.744C743.248 308.744 679.568 372.078 679.568 450.185C679.568 528.242 743.248 591.573 821.783 591.573C888.655 591.573 944.669 545.662 959.841 483.864Z',
    'M821.977 482.501C839.826 482.501 854.337 468.15 854.337 450.142C854.337 432.756 840.57 418.537 823.36 417.81C822.592 417.779 821.977 417.169 821.977 416.401V375.588C821.977 374.792 822.632 374.139 823.425 374.154C864.757 374.926 898.033 408.677 898.033 450.142C898.033 491.658 864.757 525.409 823.425 526.181C822.632 526.196 821.977 525.543 821.977 524.749V482.501Z',
];

export function cadanaHero(label) {
    const guides = GUIDES.map((d, i) => `<path d="${d}" pathLength="1" style="--i:${i}"/>`).join('');
    const mark = MARK.map((d) => `<path d="${d}"/>`).join('');
    const trace = MARK.map((d) => `<path d="${d}" pathLength="1"/>`).join('');

    return `<svg class="cadana-hero" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"
        role="img" aria-label="${label}">
        <defs>
            <mask id="cadana-hero-sweep" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="900">
                <circle class="cadana-hero__sweep" cx="801" cy="450" r="125" pathLength="1"
                    fill="none" stroke="#fff" stroke-width="260" transform="rotate(-90 801 450)"/>
            </mask>
        </defs>
        <rect width="1600" height="900" fill="#F73404"/>
        <g class="cadana-hero__mark" fill="#fff" mask="url(#cadana-hero-sweep)">${mark}</g>
        <g class="cadana-hero__guides" fill="none" stroke="#EBEDF5" stroke-width="2.12" opacity="0.5">${guides}</g>
        <g class="cadana-hero__trace" fill="none" stroke="#fff" stroke-width="2.5">${trace}</g>
    </svg>`;
}
