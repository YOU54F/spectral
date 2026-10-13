import type { IFunctionResult } from '@stoplight/spectral-core';
import arazzoRuntimeExpressionValidation from './arazzoRuntimeExpressionValidation';
import { ArazzoSpecification } from './types/arazzoTypes';

const OPERATION_PATH_REGEX = /^\{\$sourceDescriptions\.[a-zA-Z0-9_-]+\.(url)\}#.+$/;
const WORKFLOW_STEP_REF_REGEX = /^\$workflows\.([A-Za-z0-9_\\-]+)\.steps\.([A-Za-z0-9_\\-]+)$/;

export default function arazzoStepValidation(targetVal: ArazzoSpecification, _options: null): IFunctionResult[] {
  const results: IFunctionResult[] = [];

  if (!Array.isArray(targetVal.sourceDescriptions) || targetVal.sourceDescriptions.length === 0) {
    results.push({
      message: 'sourceDescriptions is missing in the Arazzo Specification.',
      path: ['sourceDescriptions'],
    });
    return results;
  }

  const sourceDescriptionNames = new Set(targetVal.sourceDescriptions.map(sd => sd.name));
  const sourceDescriptionTypes = new Map(targetVal.sourceDescriptions.map(sd => [sd.name, sd.type]));

  targetVal.workflows.forEach((workflow, workflowIndex) => {
    if (!Array.isArray(workflow.steps)) {
      // If the steps array is not defined or is not an array, skip this workflow
      return;
    }

    workflow.steps.forEach((step, stepIndex) => {
      const { operationId, operationPath, workflowId, channelPath, dependsOn } = step;

      // Validate operationId
      if (operationId != null) {
        if (operationId.startsWith('$')) {
          if (!arazzoRuntimeExpressionValidation(operationId, targetVal)) {
            results.push({
              message: `Runtime expression "${operationId}" is invalid in step "${step.stepId}".`,
              path: ['workflows', workflowIndex, 'steps', stepIndex, 'operationId'],
            });
          }

          const parts = operationId.split('.');
          const sourceName = parts[1];

          if (!sourceDescriptionNames.has(sourceName)) {
            results.push({
              message: `Source description "${sourceName}" not found for operationId "${operationId}" in step "${step.stepId}".`,
              path: ['workflows', workflowIndex, 'steps', stepIndex, 'operationId'],
            });
          }
        }
      }

      // Validate operationPath as JSON Pointer with correct format
      if (operationPath != null) {
        if (!OPERATION_PATH_REGEX.test(operationPath)) {
          results.push({
            message: `OperationPath "${operationPath}" must be a valid runtime expression following the format "{$sourceDescriptions.<name>.url}#<json-pointer>".`,
            path: ['workflows', workflowIndex, 'steps', stepIndex, 'operationPath'],
          });
        } else {
          const sourceName = operationPath.split('.')[1];

          if (!sourceDescriptionNames.has(sourceName)) {
            results.push({
              message: `Source description "${sourceName}" not found for operationPath "${operationPath}" in step "${step.stepId}".`,
              path: ['workflows', workflowIndex, 'steps', stepIndex, 'operationPath'],
            });
          }
        }
      }

      // Validate channelPath (Arazzo 1.1, AsyncAPI sources only)
      if (channelPath != null) {
        if (!OPERATION_PATH_REGEX.test(channelPath)) {
          results.push({
            message: `ChannelPath "${channelPath}" must be a valid runtime expression following the format "{$sourceDescriptions.<name>.url}#<json-pointer>".`,
            path: ['workflows', workflowIndex, 'steps', stepIndex, 'channelPath'],
          });
        } else {
          const sourceName = channelPath.split('.')[1];

          if (!sourceDescriptionNames.has(sourceName)) {
            results.push({
              message: `Source description "${sourceName}" not found for channelPath "${channelPath}" in step "${step.stepId}".`,
              path: ['workflows', workflowIndex, 'steps', stepIndex, 'channelPath'],
            });
          } else if (sourceDescriptionTypes.get(sourceName) !== 'asyncapi') {
            results.push({
              message: `Source description "${sourceName}" referenced by channelPath in step "${step.stepId}" must be of type "asyncapi".`,
              path: ['workflows', workflowIndex, 'steps', stepIndex, 'channelPath'],
            });
          }
        }
      }

      // Validate step-level dependsOn (Arazzo 1.1)
      if (Array.isArray(dependsOn)) {
        dependsOn.forEach((dep: unknown, depIndex) => {
          if (typeof dep !== 'string') return;
          const depPath = ['workflows', workflowIndex, 'steps', stepIndex, 'dependsOn', depIndex];

          if (dep === step.stepId) {
            results.push({ message: `Step "${step.stepId}" cannot depend on itself.`, path: depPath });
            return;
          }

          if (dep.startsWith('$sourceDescriptions.')) {
            const sourceName = dep.split('.')[1];
            if (!sourceDescriptionNames.has(sourceName)) {
              results.push({
                message: `Source description "${sourceName}" not found for dependsOn "${dep}" in step "${step.stepId}".`,
                path: depPath,
              });
            }
            return;
          }

          if (dep.startsWith('$workflows.')) {
            const match = WORKFLOW_STEP_REF_REGEX.exec(dep);
            const targetWorkflow = match ? targetVal.workflows.find(w => w.workflowId === match[1]) : undefined;
            if (!match || targetWorkflow?.steps?.some(s => s.stepId === match[2]) !== true) {
              results.push({
                message: `dependsOn "${dep}" in step "${step.stepId}" does not reference an existing step.`,
                path: depPath,
              });
            }
            return;
          }

          if (!workflow.steps.some(s => s.stepId === dep)) {
            results.push({
              message: `Step "${dep}" referenced in dependsOn of step "${step.stepId}" does not exist in workflow "${workflow.workflowId}".`,
              path: depPath,
            });
          }
        });
      }

      // Validate workflowId
      if (workflowId != null) {
        if (workflowId.startsWith('$')) {
          if (!arazzoRuntimeExpressionValidation(workflowId)) {
            results.push({
              message: `Runtime expression "${workflowId}" is invalid in step "${step.stepId}".`,
              path: ['workflows', workflowIndex, 'steps', stepIndex, 'workflowId'],
            });
          }

          const parts = workflowId.split('.');
          const sourceName = parts[1];

          if (!sourceDescriptionNames.has(sourceName)) {
            results.push({
              message: `Source description "${sourceName}" not found for workflowId "${workflowId}" in step "${step.stepId}".`,
              path: ['workflows', workflowIndex, 'steps', stepIndex, 'workflowId'],
            });
          }
        }
      }
    });
  });

  return results;
}
