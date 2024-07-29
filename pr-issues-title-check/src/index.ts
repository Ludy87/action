import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';

const DEFAULT_FLAGS = 'gmi';
const DEFAULT_PATTERN = '^.*$';
const DEFAULT_COMMENT = 'The title is insufficient!';

const GITHUB_PULL_REQUEST_EVENT = 'pull_request';
const GITHUB_PULL_REQUEST_TARGET_EVENT = 'pull_request_target';

const GITHUB_ISSUES = 'issues';

async function run(): Promise<void> {
    try {
        // action Inputs
        const token = core.getInput('token', { required: true });
        const client = github.getOctokit(token);
        const issuesTitlePattern =
            core.getInput('issues_pattern') || DEFAULT_PATTERN;
        const issuesPatternFlags =
            core.getInput('issues_pattern_flags') || DEFAULT_FLAGS;
        const issuesMinLen = parseInt(core.getInput('issues_min_length'));
        const issuesMaxLen = parseInt(core.getInput('issues_max_length'));
        const issuesLabels = core
            .getInput('issues_labels')
            .split(',')
            .map((label) => label.trim());
        const issuesComment = core.getInput('issues_comment');

        core.info(`minLen: ${issuesMinLen}`);
        core.info(`maxLen: ${issuesMaxLen}`);
        core.info(`labels: ${issuesLabels}`);

        const { eventName } = github.context;
        core.notice(`Event name: ${eventName}`);

        if (eventName === GITHUB_ISSUES) {
            await issues(
                client,
                issuesTitlePattern,
                issuesPatternFlags,
                issuesLabels,
                issuesComment,
            );
        } else if (
            eventName !== GITHUB_PULL_REQUEST_EVENT &&
            eventName !== GITHUB_PULL_REQUEST_TARGET_EVENT
        ) {
            await pull_request();
        } else {
            core.setFailed(`Invalid event: ${eventName}`);
            return;
        }
    } catch (error) {
        core.setFailed((error as Error)?.message ?? 'Unknown error');
    }
}

async function issues(
    client: InstanceType<typeof GitHub>,
    issuesTitlePattern: string,
    issuesPatternFlags: string,
    issuesLabels: string[],
    issuesComment: string,
): Promise<void> {
    // Get client and context
    const issue: { owner: string; repo: string; number: number } =
        github.context.issue;
    const issuesTitle: string = github.context.payload.issue?.title;
    core.info(`Issues title: ${issuesTitle}`);

    const regexFlags = issuesPatternFlags;
    const regexPattern = issuesTitlePattern;
    const regex = new RegExp(regexPattern, regexFlags);
    const regexExistsInTitle = regex.test(issuesTitle);

    const author = github.context.actor;
    const inputComment =
        issuesComment === ''
            ? `Hi @${author}! ${DEFAULT_COMMENT}`
            : issuesComment;

    // Fetch all comments on the issue
    const comments = await client.rest.issues.listComments({
        owner: issue.owner,
        repo: issue.repo,
        issue_number: issue.number,
    });

    const existingComment = comments.data.find(
        (comment) =>
            comment.body === inputComment && comment.user?.id === 41898282,
    );

    if (!regexExistsInTitle) {
        // add Labels from input
        await client.rest.issues.addLabels({
            owner: issue.owner,
            repo: issue.repo,
            issue_number: issue.number,
            labels: issuesLabels,
        });

        // Create the specific comment if not exists
        if (!existingComment) {
            await client.rest.issues.createComment({
                owner: issue.owner,
                repo: issue.repo,
                issue_number: issue.number,
                body: inputComment,
            });
            core.info(`Create comment`);
            return;
        } else {
            core.info('Comment already exists');
        }
        return;
    } else {
        // find all Labels from Issues
        const labels = await client.rest.issues.listLabelsOnIssue({
            owner: issue.owner,
            repo: issue.repo,
            issue_number: issue.number,
        });

        // Remove only labels from issuesLabels
        const labelNames = labels.data.map((label) => label.name.trim());
        core.info(`Labels on issue: ${labelNames.join(', ')}`);
        for (const label of issuesLabels) {
            if (labelNames.includes(label)) {
                await client.rest.issues.removeLabel({
                    owner: issue.owner,
                    repo: issue.repo,
                    issue_number: issue.number,
                    name: label,
                });
                core.info(`Removed label: ${label}`);
            }
        }

        // Find and delete the specific comment
        if (existingComment) {
            await client.rest.issues.deleteComment({
                owner: issue.owner,
                repo: issue.repo,
                comment_id: existingComment.id,
            });
            core.info(`Removed comment: ${existingComment.id}`);
        } else {
            core.info('No matching comment found');
        }
    }
    core.setOutput('valid', 'true');
}

async function pull_request(): Promise<void> {
    core.info('Pull request logic is not implemented.');
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

run().catch((error) => core.setFailed(error.message)); // Catch unhandled errors
