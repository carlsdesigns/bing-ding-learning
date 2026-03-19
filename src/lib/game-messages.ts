type GameType = 'numbers' | 'alphabet' | 'playground';

const NUMBERS_INTROS = [
  (name: string) => `Hey ${name}! Let's play the numbers game!`,
  (name: string) => `Yay ${name}! Numbers time!`,
  (name: string) => `${name}, let's count together!`,
];

const ALPHABET_INTROS = [
  (name: string) => `Hey ${name}! Let's play the alphabet game!`,
  (name: string) => `Yay ${name}! Letter time!`,
  (name: string) => `${name}, let's find some letters!`,
];

const PLAYGROUND_INTROS = [
  (name: string) => `Hey ${name}! Welcome to the playground! Press any letter and watch the magic happen!`,
  (name: string) => `${name}, it's playtime! Tap the letters and fill the screen with fun pictures!`,
  (name: string) => `Yay ${name}! This is your creative space! Press letters to make pictures appear!`,
  (name: string) => `Hi ${name}! Let's make some art! Tap letters to see cool pictures pop up!`,
  (name: string) => `${name}, get ready for fun! Press any letter and see what appears!`,
];

const NUMBERS_INTROS_NO_NAME = [
  `Hey! Let's play the numbers game!`,
  `Yay! Numbers time!`,
  `Let's count together!`,
];

const ALPHABET_INTROS_NO_NAME = [
  `Hey! Let's play the alphabet game!`,
  `Yay! Letter time!`,
  `Let's find some letters!`,
];

const PLAYGROUND_INTROS_NO_NAME = [
  `Welcome to the playground! Press any letter and watch the magic happen!`,
  `It's playtime! Tap the letters and fill the screen with fun pictures!`,
  `This is your creative space! Press letters to make pictures appear!`,
  `Let's make some art! Tap letters to see cool pictures pop up!`,
  `Get ready for fun! Press any letter and see what appears!`,
];

const CORRECT_WITH_NAME = [
  (name: string) => `Amazing job, ${name}! You're so smart!`,
  (name: string) => `Wow ${name}, you got it! Keep going!`,
  (name: string) => `${name}, you're doing fantastic!`,
  (name: string) => `That's right, ${name}! You're a superstar!`,
];

const CORRECT_NO_NAME = [
  `Amazing job! You're so smart!`,
  `Wow, you got it! Keep going!`,
  `You're doing fantastic!`,
  `That's right! You're a superstar!`,
  `Great job! Keep it up!`,
  `Yay! You did it!`,
  `Perfect! You're so good at this!`,
];

const ENCOURAGEMENT_WITH_NAME = [
  (name: string) => `You can do it, ${name}! Try again!`,
  (name: string) => `Almost, ${name}! Give it another try!`,
  (name: string) => `Keep trying, ${name}! You're learning!`,
];

const ENCOURAGEMENT_NO_NAME = [
  `You can do it! Try again!`,
  `Almost! Give it another try!`,
  `Keep trying! You're learning!`,
  `Oops! Try once more!`,
  `So close! You've got this!`,
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getGameIntro(gameType: GameType, childName?: string): string {
  if (childName) {
    const intros = gameType === 'numbers' 
      ? NUMBERS_INTROS 
      : gameType === 'alphabet' 
        ? ALPHABET_INTROS 
        : PLAYGROUND_INTROS;
    return randomFrom(intros)(childName);
  } else {
    const intros = gameType === 'numbers' 
      ? NUMBERS_INTROS_NO_NAME 
      : gameType === 'alphabet' 
        ? ALPHABET_INTROS_NO_NAME 
        : PLAYGROUND_INTROS_NO_NAME;
    return randomFrom(intros);
  }
}

export function getCorrectMessage(childName?: string, useName: boolean = false): string {
  if (childName && useName) {
    return randomFrom(CORRECT_WITH_NAME)(childName);
  }
  return randomFrom(CORRECT_NO_NAME);
}

export function getEncouragementMessage(childName?: string, useName: boolean = false): string {
  if (childName && useName) {
    return randomFrom(ENCOURAGEMENT_WITH_NAME)(childName);
  }
  return randomFrom(ENCOURAGEMENT_NO_NAME);
}

export function getQuestionPrompt(
  gameType: GameType, 
  item: string, 
  childName?: string, 
  useName: boolean = false
): string {
  if (gameType === 'numbers') {
    if (childName && useName) {
      return `${childName}, can you find the number ${item}?`;
    }
    return `Find the number ${item}!`;
  } else {
    if (childName && useName) {
      return `${childName}, can you find the letter ${item}?`;
    }
    return `Find the letter ${item}!`;
  }
}
