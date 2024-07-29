import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';

const DEFAULT_FLAGS = 'i';
const DEFAULT_COMMENT = 'The title is insufficient!';

const GITHUB_PULL_REQUEST_EVENT = 'pull_request';
const GITHUB_PULL_REQUEST_TARGET_EVENT = 'pull_request_target';

const GITHUB_ISSUES = 'issues';

let no_limit = false;

async function run(): Promise<void> {
    try {
        // action Inputs
        const token = core.getInput('token', { required: true });
        const client = github.getOctokit(token);
        const issuesTitlePattern = core.getInput('issues_pattern');
        const issues_prefix = core.getMultilineInput('issues_prefix');
        const issuesPatternFlags =
            core.getInput('issues_pattern_flags') || DEFAULT_FLAGS;
        const issuesMinLen = parseInt(core.getInput('issues_min_length'));
        const issuesMaxLen = parseInt(core.getInput('issues_max_length'));
        const issuesLabelsInput = core.getInput('issues_labels');
        const issuesLabels = issuesLabelsInput
            ? issuesLabelsInput.split(',').map((label) => label.trim())
            : [];
        const issuesComment = core.getInput('issues_comment');

        const actorWithoutRestriction = core.getMultilineInput(
            'actor_without_restriction',
        );
        const actor = github.context.actor;

        actorWithoutRestriction.forEach((a) => {
            if (a === actor) {
                core.debug(`${actor} has no limitation`);
                no_limit = true;
            } else {
                core.debug(`${actor} has limitation`);
            }
        });

        core.info(`minLen: ${issuesMinLen}`);
        core.info(`maxLen: ${issuesMaxLen}`);
        core.info(`labels: ${issuesLabels} - ${issuesLabels.length}`);
        core.info(`actor: ${actor}`);

        issues_prefix.forEach((prefix) => {
            core.info(prefix.trim());
        });

        const { eventName } = github.context;
        core.notice(`Event name: ${eventName}`);

        if (eventName === GITHUB_ISSUES) {
            await issues(
                client,
                actor,
                issuesTitlePattern,
                issuesPatternFlags,
                issuesLabels,
                issuesComment,
                issuesMinLen,
                issuesMaxLen,
                issues_prefix,
            );
        } else if (
            eventName === GITHUB_PULL_REQUEST_EVENT ||
            eventName === GITHUB_PULL_REQUEST_TARGET_EVENT
        ) {
            await pull_request();
        } else {
            core.error(`Invalid event: ${eventName}`);
            return;
        }
    } catch (error) {
        core.error((error as Error)?.message ?? 'Unknown error');
    }
}

async function issues(
    client: InstanceType<typeof GitHub>,
    actor: string,
    issuesTitlePattern: string,
    issuesPatternFlags: string,
    issuesLabels: string[],
    issuesComment: string,
    issuesMinLen: number,
    issuesMaxLen: number,
    issues_prefix: string[],
): Promise<void> {
    // Get client and context
    const issue: { owner: string; repo: string; number: number } =
        github.context.issue;
    let issuesTitle: string = github.context.payload.issue?.title;
    const issues_title: string = issuesTitle;
    core.info(`Issues title: ${issuesTitle}`);

    issues_prefix.forEach((title) => {
        if (issuesTitle.includes(title)) {
            issuesTitle = issuesTitle.replace(title, '').trim();
        }
    });

    let lengths_fail = '';

    // Check if regex is provided
    const regexFlags = issuesPatternFlags;
    const regexPattern = issuesTitlePattern;
    const regex = new RegExp(regexPattern, regexFlags);
    const regexExistsInTitle = regex.test(issuesTitle);

    if (!regexPattern && isNaN(issuesMinLen) && isNaN(issuesMaxLen)) {
        core.setFailed(
            'issues_pattern or (issues_min_length && issues_min_length) müssen angegeben werden',
        );
    }

    if (!regexPattern) {
        // Check min length
        if (
            !isNaN(issuesMinLen) &&
            issuesTitle.length < issuesMinLen &&
            !no_limit
        ) {
            core.error(
                `Issues title "${issues_title}" is smaller than min length specified - ${issuesMinLen}`,
            );
            lengths_fail += `

            Issues title "${issues_title}" is smaller than min length specified - ${issuesMinLen}`;
        }

        // Check max length
        if (
            !isNaN(issuesMaxLen) &&
            issuesMaxLen > 0 &&
            issuesTitle.length > issuesMaxLen &&
            !no_limit
        ) {
            core.error(
                `Issues title "${issues_title}" is greater than max length specified - ${issuesMaxLen}`,
            );
            lengths_fail += `

            Issues title "${issues_title}" is greater than max length specified - ${issuesMaxLen}`;
        }
    }

    const inputComment =
        issuesComment === ''
            ? `Hi @${actor}! ${DEFAULT_COMMENT}`
            : `${issuesComment}`;

    // Fetch all comments on the issue
    const comments = await client.rest.issues.listComments({
        owner: issue.owner,
        repo: issue.repo,
        issue_number: issue.number,
    });

    const existingComment = comments.data.find(
        (comment) =>
            comment.body?.startsWith(inputComment) &&
            comment.user?.id === 41898282,
    );

    if (
        (!regexExistsInTitle || lengths_fail) &&
        !no_limit &&
        (isNaN(issuesMaxLen) || isNaN(issuesMinLen))
    ) {
        // add Labels from input
        if (issuesLabels.length > 0) {
            await client.rest.issues.addLabels({
                owner: issue.owner,
                repo: issue.repo,
                issue_number: issue.number,
                labels: issuesLabels,
            });
        }
        // Create the specific comment if not exists
        if (!existingComment) {
            await client.rest.issues.createComment({
                owner: issue.owner,
                repo: issue.repo,
                issue_number: issue.number,
                body: inputComment + lengths_fail,
            });
            core.info(`Create comment`);
            return;
        } else {
            core.debug('Comment already exists');
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
            core.debug('No matching comment found');
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
