import * as core from '@actions/core';
import * as github from '@actions/github';

// const DEFAULT_FLAGS = 'gmi';
// const DEFAULT_PATTERN =
//     '^(\\[Feature Request\\]: |\\[Bug\\]: )(?:(\\b\\w{2,}\\b\\s+){2,}\\b\\w{2,}\\b)|^(?:(\\b\\w{2,}\\b\\s+){2,}\\b\\w{2,}\\b)';

// const GITHUB_PULL_REQUEST_EVENT = 'pull_request';
// const GITHUB_PULL_REQUEST_TARGET_EVENT = 'pull_request_target';

const GITHUB_ISSUES = 'issues';
// const GITHUB_ISSUES_OPENED = 'opened';
// const GITHUB_ISSUES_REOPENED = 'reopened';
// const GITHUB_ISSUES_EDITED = 'edited';

function run(): void {
    pull_request();
    issues();
}

function issues(): void {
    try {
        const { eventName } = github.context;
        core.info(`Event name: ${eventName}`);

        if (eventName !== GITHUB_ISSUES) {
            core.setFailed(`Invalid event: ${eventName}`);
            return;
        }
        const issuesTitle: string | undefined =
            github.context.payload.issue?.title;
        core.info(`Issues title: ${issuesTitle}`);
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        } else {
            core.setFailed('unknown error');
        }
    }
}

function pull_request(): void {
    return;
    // try {
    //     const { eventName } = github.context;
    //     core.info(`Event name: ${eventName}`);

    //     if (
    //         eventName !== GITHUB_PULL_REQUEST_EVENT &&
    //         eventName !== GITHUB_PULL_REQUEST_TARGET_EVENT
    //     ) {
    //         core.setFailed(`Invalid event: ${eventName}`);
    //         return;
    //     }

    //     const pullRequestTitle: string | undefined =
    //         github.context.payload.pull_request?.title;
    //     core.info(`PR title: ${pullRequestTitle}`);

    //     if (!pullRequestTitle) {
    //         core.setFailed('Pull Request title not defined');
    //         return;
    //     }

    //     const inputPattern = core.getInput('pattern');
    //     const inputFlags = core.getInput('flags');

    //     if (inputFlags === '') {
    //         core.info('No input flags present. Will fallback to default');
    //     }

    //     if (inputPattern === '') {
    //         core.info('No input pattern present. Will fallback to default');
    //     }

    //     const regexPattern =
    //         inputPattern === '' ? DEFAULT_PATTERN : inputPattern;
    //     const regexFlags = inputFlags === '' ? DEFAULT_FLAGS : inputFlags;

    //     core.info(`Pattern: ${regexPattern}`);
    //     core.info(`Flags: ${regexFlags}`);

    //     const regex = new RegExp(regexPattern, regexFlags);
    //     const regexExistsInTitle = regex.test(pullRequestTitle);

    //     if (!regexExistsInTitle) {
    //         core.setFailed('PR title does not contain the regex pattern');
    //         return;
    //     }

    //     core.info('Pattern exists in PR title');
    // } catch (error) {
    //     if (error instanceof Error) {
    //         core.setFailed(error.message);
    //     } else {
    //         core.setFailed('unknown error');
    //     }
    // }
}

run();
