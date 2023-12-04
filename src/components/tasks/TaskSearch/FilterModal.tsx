import className from './tasksearch.module.scss';
import {
    Tab,
    depreciatedTaskStatus,
    newTaskStatus,
} from '@/interfaces/task.type';
import { getChangedStatusName } from '@/utils/getChangedStatusName';
import { useEffect } from 'react';

type FilterModalProps = {
    tabs: Tab[];
    onSelect: (tab: Tab) => void;
    activeTab?: Tab;
    onClose: () => void;
    dev?: boolean;
};

const FilterModal = ({
    tabs,
    onSelect,
    activeTab,
    onClose,
    dev,
}: FilterModalProps) => {
    const onKeyDownHandler = (event: KeyboardEvent) => {
        if (dev && event.key === 'Escape') onClose();
    };
    useEffect(() => {
        document.addEventListener('keydown', onKeyDownHandler);
        return () => document.removeEventListener('keydown', onKeyDownHandler);
    }, []);

    return (
        <>
            {dev && (
                <div
                    onClick={onClose}
                    className={className['filter-modal-background']}
                ></div>
            )}
            <div
                className={`${className['filter-modal']} ${
                    dev ? className['filter-modal-dev'] : ''
                }`}
                data-testid="filter-modal"
            >
                <div className={className['filter-modal-title']}>
                    <span>Filter</span>
                    <span
                        className={className['close-button']}
                        onClick={onClose}
                    >
                        &times;
                    </span>
                </div>
                <div className={className['status-filter']}>
                    {tabs
                        .filter((tab: Tab) =>
                            dev
                                ? !depreciatedTaskStatus.includes(tab)
                                : tab != Tab.BLOCKED &&
                                  tab != Tab.ASSIGNEE_ARCHIVED &&
                                  !newTaskStatus.includes(tab)
                        )
                        .map((tab) => (
                            <button
                                key={tab}
                                className={`${className['status-button']} ${
                                    activeTab === tab
                                        ? className['status-button-active']
                                        : ''
                                }`}
                                onClick={() => {
                                    onSelect(tab);
                                    onClose();
                                }}
                            >
                                {getChangedStatusName(tab)}
                            </button>
                        ))}
                </div>
            </div>
        </>
    );
};

export default FilterModal;
