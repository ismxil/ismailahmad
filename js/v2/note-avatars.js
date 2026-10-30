// Visitor avatar choices extracted from the supplied illustration sheet.
export const NOTE_AVATARS = [
    { id: 'sunny', label: 'Sunny' },
    { id: 'mint', label: 'Mint' },
    { id: 'sky', label: 'Sky' },
    { id: 'lilac', label: 'Lilac' },
    { id: 'peach', label: 'Peach' },
    { id: 'night', label: 'Night' },
    { id: 'scout', label: 'Scout' },
    { id: 'star', label: 'Star' },
    { id: 'buddy', label: 'Buddy' },
    { id: 'hello', label: 'Hello' },
    { id: 'shades', label: 'Shades' },
    { id: 'bowtie', label: 'Bow tie' },
];

export function noteAvatarMarkup(avatar) {
    return `<img src="/assets/note-avatars/${avatar.id}.webp" width="40" height="40" alt="" />`;
}
