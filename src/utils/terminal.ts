const enterScreenCommand = `\x1b[?1049h`;
const leaveScreenCommand = `\x1b[?1049l`;

export const enterFullscreen = () => void process.stdout.write(enterScreenCommand);
export const exitFullscreen = () => void process.stdout.write(leaveScreenCommand);
