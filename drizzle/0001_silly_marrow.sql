CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quizId` int NOT NULL,
	`questionNumber` int NOT NULL,
	`questionText` text NOT NULL,
	`optionA` text NOT NULL,
	`optionB` text NOT NULL,
	`optionC` text NOT NULL,
	`optionD` text NOT NULL,
	`correctAnswer` varchar(1) NOT NULL,
	`explanation` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quizId` int NOT NULL,
	`userId` int NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`score` int,
	`totalMarks` int,
	`correctAnswers` int,
	`timeTaken` int,
	`status` enum('in_progress','completed','abandoned') NOT NULL DEFAULT 'in_progress',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quizAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`fileKey` varchar(255) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`totalQuestions` int NOT NULL DEFAULT 0,
	`timeLimit` int NOT NULL DEFAULT 3600,
	`passingScore` int NOT NULL DEFAULT 50,
	`isPublished` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quizzes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userResponses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` int NOT NULL,
	`questionId` int NOT NULL,
	`selectedAnswer` varchar(1),
	`isCorrect` boolean,
	`timeSpent` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userResponses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_quizId_quizzes_id_fk` FOREIGN KEY (`quizId`) REFERENCES `quizzes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizAttempts` ADD CONSTRAINT `quizAttempts_quizId_quizzes_id_fk` FOREIGN KEY (`quizId`) REFERENCES `quizzes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizAttempts` ADD CONSTRAINT `quizAttempts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizzes` ADD CONSTRAINT `quizzes_providerId_users_id_fk` FOREIGN KEY (`providerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userResponses` ADD CONSTRAINT `userResponses_attemptId_quizAttempts_id_fk` FOREIGN KEY (`attemptId`) REFERENCES `quizAttempts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userResponses` ADD CONSTRAINT `userResponses_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;