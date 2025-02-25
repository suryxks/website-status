import React, { ChangeEvent, FC, useState, useEffect, useRef } from 'react';
import TaskContainer from './TaskContainer';
import Details from './Details';
import { toast, ToastTypes } from '@/helperFunctions/toast';
import convertTimeStamp from '@/helperFunctions/convertTimeStamp';
import classNames from './task-details.module.scss';
import { useRouter } from 'next/router';
import {
    useGetTaskDetailsQuery,
    useUpdateTaskDetailsMutation,
} from '@/app/services/taskDetailsApi';

import useUserData from '@/hooks/useUserData';
import {
    ButtonProps,
    TextAreaProps,
    taskDetailsDataType,
} from '@/interfaces/taskDetails.type';
import Layout from '@/components/Layout';
import TaskDependency from '@/components/taskDetails/taskDependency';
import { useGetProgressDetailsQuery } from '@/app/services/progressesApi';
import { ProgressDetailsData } from '@/types/standup.type';
import { useAddOrUpdateMutation } from '@/app/services/taskRequestApi';
import Progress from '../ProgressCard';
import TaskManagementModal from '../issues/TaskManagementModal';
import { TASK_REQUEST_TYPES } from '@/constants/tasks';
import { TaskRequestData } from '../issues/constants';
import ProgressContainer from '../tasks/card/progressContainer';
import DevFeature from '../DevFeature';
import Suggestions from '../tasks/SuggestionBox/Suggestions';
import { BACKEND_TASK_STATUS } from '@/constants/task-status';
import task from '@/interfaces/task.type';

const taskStatus = Object.entries(BACKEND_TASK_STATUS);

export function Button(props: ButtonProps) {
    const { buttonName, clickHandler, value } = props;
    return (
        <button
            type="button"
            className={classNames['button']}
            onClick={() => clickHandler(value ?? true)}
        >
            {buttonName}
        </button>
    );
}
export function Textarea(props: TextAreaProps) {
    const { name, value, onChange, testId, placeholder } = props;

    return (
        <textarea
            className={classNames['textarea']}
            name={name}
            value={value}
            onChange={onChange}
            data-testid={testId}
            placeholder={placeholder}
        />
    );
}

type Props = {
    url?: string;
    taskID: string;
};
const TaskDetails: FC<Props> = ({ taskID }) => {
    const router = useRouter();
    const { query } = router;
    const isDevModeEnabled = query.dev === 'true' ? true : false;

    const { isUserAuthorized, data: userData } = useUserData();
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const toggleTaskRequestModal = () => {
        setIsTaskModalOpen(!isTaskModalOpen);
    };
    const [requestId, setRequestId] = useState<string>();
    const [newEndOnDate, setNewEndOnDate] = useState('');
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const { data, isError, isLoading, isFetching } =
        useGetTaskDetailsQuery(taskID);

    const taskDependencyIds: string[] = !isFetching
        ? data?.taskData?.dependsOn || []
        : [];
    const { SUCCESS, ERROR } = ToastTypes;

    const taskDetailsData: task = {
        ...(data?.taskData || {}),
        id: taskID,
    } as task;

    const [editedTaskDetails, setEditedTaskDetails] = useState<task>({
        ...(data?.taskData || {}),
        id: taskID,
    } as task);
    const [assigneeName, setAssigneeName] = useState<string>(
        data?.taskData?.assignee || ''
    );
    const inputRef = useRef<HTMLInputElement>(null);
    const [showSuggestion, setShowSuggestion] = useState<boolean>(false);
    const handleAssignment = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAssigneeName(e.target.value);
        setShowSuggestion(Boolean(e.target.value));
    };
    const handleAssigneSelect = async (userName: string) => {
        inputRef.current?.focus();
        setAssigneeName(userName);
        setShowSuggestion(false);
        setEditedTaskDetails((prev) => ({ ...prev, assignee: userName }));
    };
    const handleTaskStatusUpdate = (
        ev: React.ChangeEvent<HTMLSelectElement>
    ) => {
        const newStatus: string = ev.target.value;

        setEditedTaskDetails((prev) => ({ ...prev, status: newStatus }));
    };
    const [addOrUpdateTaskRequest, taskRequestUpdateStatus] =
        useAddOrUpdateMutation();

    useEffect(() => {
        if (data?.taskData) {
            setEditedTaskDetails({
                ...data?.taskData,
                id: taskID,
            } as task);
        }
    }, [data]);

    const [updateTaskDetails] = useUpdateTaskDetailsMutation();

    function onCancel() {
        setIsEditing(false);
        setEditedTaskDetails(taskDetailsData);
        setNewEndOnDate('');
    }
    async function onSave() {
        setIsEditing(false);
        setNewEndOnDate('');
        const updatedFields: Partial<taskDetailsDataType['taskData']> = {};
        for (const key in editedTaskDetails) {
            if (
                taskDetailsData &&
                editedTaskDetails[
                    key as keyof taskDetailsDataType['taskData']
                ] !==
                    taskDetailsData[
                        key as keyof taskDetailsDataType['taskData']
                    ]
            ) {
                updatedFields[key as keyof taskDetailsDataType['taskData']] =
                    editedTaskDetails[
                        key as keyof taskDetailsDataType['taskData']
                    ];
            }
        }

        if (Object.keys(updatedFields).length === 0) {
            return;
        }

        await updateTaskDetails({
            editedDetails: updatedFields,
            taskID,
        })
            .unwrap()
            .then(() => toast(SUCCESS, 'Successfully saved'))
            .catch((error) => toast(ERROR, error.data.message));
    }

    function handleChange(
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) {
        const { name, value } = event.target;

        setEditedTaskDetails((prevState) => ({
            ...prevState!,
            ...(prevState
                ? { [name]: name === 'dependsOn' ? [value] : value }
                : {}),
        }));
    }

    const handleCreateTaskRequest = async (data: TaskRequestData) => {
        const requestData = {
            taskId: taskID,
            userId: userData?.id || '',
            requestType: TASK_REQUEST_TYPES.ASSIGNMENT,
            proposedStartDate: data.startedOn,
            proposedDeadline: data.endsOn,
            description: data.description,
        };
        if (!requestData.description) delete requestData.description;
        try {
            const response = await addOrUpdateTaskRequest(requestData).unwrap();
            setRequestId(response.data.id);
            toast(SUCCESS, response.message);
        } catch (error: any) {
            toast(ERROR, error.data.message);
        }
    };

    function renderLoadingComponent() {
        if (isLoading) {
            return <p className={classNames.textCenter}>Loading...</p>;
        }
        if (isError) {
            return (
                <p className={classNames.textCenter}>Something went wrong!</p>
            );
        }
    }

    function getStartedOn(timestamp: string | undefined) {
        return timestamp ? convertTimeStamp(parseInt(timestamp, 10)) : 'N/A';
    }

    function getEndsOn(timestamp: number | undefined) {
        return timestamp ? convertTimeStamp(timestamp) : 'TBD';
    }

    const shouldRenderParentContainer = () => !isLoading && !isError && data;

    const { data: progressData } = useGetProgressDetailsQuery({
        taskId: taskID,
    });
    const taskProgress: ProgressDetailsData[] = progressData?.data || [];

    const handleBlurOfEndsOn = () => {
        const endsOn = new Date(`${newEndOnDate}`).getTime() / 1000;

        if (endsOn > 0) {
            setEditedTaskDetails((prev) => ({
                ...prev,
                endsOn,
            }));
        }
    };

    return (
        <Layout hideHeader={true}>
            {renderLoadingComponent()}
            {shouldRenderParentContainer() && (
                <div className={classNames.parentContainer}>
                    <div className={classNames.titleContainer}>
                        {isEditing ? (
                            <Textarea
                                name="title"
                                value={editedTaskDetails?.title}
                                onChange={handleChange}
                                testId="title-textarea"
                                placeholder=""
                            />
                        ) : (
                            <span
                                data-testid="task-title"
                                className={classNames.taskTitle}
                            >
                                {taskDetailsData?.title}
                            </span>
                        )}
                        {!isEditing ? (
                            isUserAuthorized && (
                                <Button
                                    buttonName="Edit"
                                    clickHandler={setIsEditing}
                                    value={true}
                                />
                            )
                        ) : (
                            <div className={classNames.editMode}>
                                <Button
                                    buttonName="Cancel"
                                    clickHandler={onCancel}
                                />
                                <Button
                                    buttonName="Save"
                                    clickHandler={onSave}
                                />
                            </div>
                        )}
                    </div>

                    <section className={classNames.detailsContainer}>
                        <section className={classNames.leftContainer}>
                            <TaskContainer title="Description" hasImg={false}>
                                {isEditing ? (
                                    <Textarea
                                        name="purpose"
                                        value={editedTaskDetails?.purpose}
                                        onChange={handleChange}
                                        testId="purpose-textarea"
                                        placeholder=""
                                    />
                                ) : (
                                    <p>
                                        {!taskDetailsData?.purpose
                                            ? 'No description available'
                                            : taskDetailsData?.purpose}
                                    </p>
                                )}
                            </TaskContainer>
                            <TaskContainer title="Details" hasImg={false}>
                                <div
                                    className={
                                        classNames['sub_details_grid_container']
                                    }
                                >
                                    <Details
                                        detailType={'Type'}
                                        value={taskDetailsData?.type}
                                    />
                                    <Details
                                        detailType={'Priority'}
                                        value={taskDetailsData?.priority}
                                    />
                                    <DevFeature>
                                        {isEditing && (
                                            <label>
                                                Status:
                                                <select
                                                    name="status"
                                                    onChange={
                                                        handleTaskStatusUpdate
                                                    }
                                                    value={
                                                        editedTaskDetails?.status
                                                    }
                                                >
                                                    {taskStatus.map(
                                                        ([name, status]) => (
                                                            <option
                                                                key={status}
                                                                value={status}
                                                            >
                                                                {name}
                                                            </option>
                                                        )
                                                    )}
                                                </select>
                                            </label>
                                        )}
                                    </DevFeature>
                                    <Details
                                        detailType={'Status'}
                                        value={taskDetailsData?.status}
                                    />
                                    <Details
                                        detailType={'Link'}
                                        value={
                                            taskDetailsData?.github?.issue
                                                ?.html_url
                                        }
                                    />
                                    <DevFeature>
                                        {isUserAuthorized && (
                                            <ProgressContainer
                                                content={taskDetailsData}
                                            />
                                        )}
                                    </DevFeature>
                                </div>
                            </TaskContainer>
                            <Progress taskProgress={taskProgress} />
                            <>
                                <TaskContainer
                                    title="Task Dependencies"
                                    hasImg={false}
                                >
                                    <TaskDependency
                                        taskDependencyIds={taskDependencyIds}
                                        isEditing={isEditing}
                                        setEditedTaskDetails={
                                            setEditedTaskDetails
                                        }
                                    />
                                </TaskContainer>
                            </>
                        </section>

                        <section className={classNames.rightContainer}>
                            <TaskContainer
                                src="/participant_logo.png"
                                title="Participants"
                                hasImg={true}
                            >
                                <Details
                                    detailType={'Assignee'}
                                    value={
                                        taskDetailsData?.type === 'feature'
                                            ? taskDetailsData?.assignee
                                            : taskDetailsData?.participants?.join(
                                                  ' , '
                                              )
                                    }
                                />
                                <DevFeature>
                                    {isEditing && isUserAuthorized && (
                                        <div
                                            className={`${classNames.assigneeSuggestionInput} ${classNames.assignedToSection}`}
                                        >
                                            <Suggestions
                                                assigneeName={assigneeName}
                                                showSuggestion={showSuggestion}
                                                handleClick={
                                                    handleAssigneSelect
                                                }
                                                handleAssignment={
                                                    handleAssignment
                                                }
                                                setShowSuggestion={
                                                    setShowSuggestion
                                                }
                                                ref={inputRef}
                                            />
                                        </div>
                                    )}
                                </DevFeature>
                                <Details
                                    detailType={'Reporter'}
                                    value={'Ankush'}
                                />
                            </TaskContainer>
                            <TaskContainer
                                src="/calendar-icon.png"
                                title="Dates"
                                hasImg={true}
                            >
                                <Details
                                    detailType={'Started On'}
                                    value={getStartedOn(
                                        taskDetailsData?.startedOn
                                    )}
                                />

                                <Details
                                    detailType={'Ends On'}
                                    value={getEndsOn(taskDetailsData?.endsOn)}
                                />
                                <DevFeature>
                                    {isEditing && (
                                        <>
                                            <label htmlFor="endsOnTaskDetails">
                                                Ends On:
                                            </label>
                                            <input
                                                id="endsOnTaskDetails"
                                                type="date"
                                                name="endsOn"
                                                onChange={(e) => {
                                                    setNewEndOnDate(
                                                        e.target.value
                                                    );
                                                }}
                                                onBlur={handleBlurOfEndsOn}
                                                value={newEndOnDate}
                                                data-testid="endsOnTaskDetails"
                                            />
                                        </>
                                    )}
                                </DevFeature>
                            </TaskContainer>
                            <TaskContainer
                                hasImg={false}
                                title="Update Progress"
                            >
                                <button
                                    data-testid="update-progress-button"
                                    className={classNames.button}
                                    onClick={() =>
                                        router.push(
                                            `/progress/${taskID}?dev=true`
                                        )
                                    }
                                >
                                    Update Progress
                                </button>
                            </TaskContainer>
                            {isDevModeEnabled && (
                                <div>
                                    <TaskContainer
                                        hasImg={false}
                                        title="Request for task"
                                    >
                                        <button
                                            data-testid="request-task-button"
                                            className={classNames.button}
                                            onClick={toggleTaskRequestModal}
                                        >
                                            Request for task
                                        </button>
                                        <TaskManagementModal
                                            isUserAuthorized={false}
                                            isOpen={isTaskModalOpen}
                                            toggle={toggleTaskRequestModal}
                                            requestId={requestId}
                                            handleCreateTaskRequest={
                                                handleCreateTaskRequest
                                            }
                                        />
                                    </TaskContainer>
                                </div>
                            )}
                        </section>
                    </section>
                </div>
            )}
        </Layout>
    );
};

export default TaskDetails;
