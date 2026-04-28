import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Dialog, Popover } from 'heroui-native';
import { ChevronDown } from 'lucide-react-native';
import Column from '../../layout/Column';
import { WebDropdownPortal } from '../../../../contexts/WebDropdownProvider';
import AppDropdownEmptyState from './dropdown/AppDropdownEmptyState';
import AppDropdownItem from './dropdown/AppDropdownItem';
import AppDropdownMenu from './dropdown/AppDropdownMenu';
import AppDropdownTrigger from './dropdown/AppDropdownTrigger';
import FontText from '../text/FontText';

export interface AppDropdownOption {
    value: string;
    label: string;
}

interface AppDropdownProps {
    options: AppDropdownOption[];
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    emptyText?: string;
    triggerClassName?: string;
    contentClassName?: string;
    itemClassName?: string;
    selectedItemClassName?: string;
    emptyStateClassName?: string;
    isInDialog?: boolean;
    disabled?: boolean;
    allowUnselect?: boolean;
    unselectLabel?: string;
}

interface WebDropdownMenuPosition {
    bottom?: number;
    left: number;
    maxHeight: number;
    top?: number;
    width: number;
}

const WEB_DROPDOWN_OFFSET = 8;
const WEB_DROPDOWN_VIEWPORT_PADDING = 12;

const AppDropdown = ({
    options,
    value,
    onValueChange,
    placeholder = 'Select an option',
    emptyText = 'No options available',
    triggerClassName = '',
    contentClassName = '',
    itemClassName = '',
    selectedItemClassName = '',
    emptyStateClassName = '',
    isInDialog = false,
    disabled = false,
    allowUnselect = true,
    unselectLabel = '— None —',
}: AppDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(value ?? '');
    const [webMenuPosition, setWebMenuPosition] = useState<WebDropdownMenuPosition | null>(null);
    const menuId = useId();
    const triggerRef = useRef<any>(null);

    useEffect(() => {
        setSelectedValue(value ?? '');
    }, [value]);

    const selectedOption = options.find((option) => option.value === selectedValue);

    const closeDropdown = useCallback(() => {
        setIsOpen(false);
        setWebMenuPosition(null);
    }, []);

    const updateWebMenuPosition = useCallback(() => {
        if (Platform.OS !== 'web' || typeof window === 'undefined') {
            return;
        }

        const triggerElement = triggerRef.current;
        const triggerRect = triggerElement?.getBoundingClientRect?.();

        if (!triggerRect) {
            return;
        }

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const menuWidth = Math.max(triggerRect.width, 160);
        const spaceBelow = viewportHeight - triggerRect.bottom - WEB_DROPDOWN_VIEWPORT_PADDING;
        const spaceAbove = triggerRect.top - WEB_DROPDOWN_VIEWPORT_PADDING;
        const shouldOpenAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
        const constrainedLeft = Math.min(
            Math.max(WEB_DROPDOWN_VIEWPORT_PADDING, triggerRect.left),
            Math.max(WEB_DROPDOWN_VIEWPORT_PADDING, viewportWidth - menuWidth - WEB_DROPDOWN_VIEWPORT_PADDING)
        );
        const maxHeight = Math.max(
            120,
            (shouldOpenAbove ? spaceAbove : spaceBelow) - WEB_DROPDOWN_OFFSET
        );

        const nextPosition = shouldOpenAbove
            ? {
                bottom: viewportHeight - triggerRect.top + WEB_DROPDOWN_OFFSET,
                left: constrainedLeft,
                maxHeight,
                width: menuWidth,
            }
            : {
                left: constrainedLeft,
                maxHeight,
                top: triggerRect.bottom + WEB_DROPDOWN_OFFSET,
                width: menuWidth,
            };

        setWebMenuPosition(nextPosition);
    }, []);

    const handleValueChange = useCallback((nextValue: string) => {
        setSelectedValue(nextValue);
        onValueChange(nextValue);
        closeDropdown();
    }, [closeDropdown, onValueChange]);

    const handleTriggerPress = useCallback(() => {
        if (disabled) {
            return;
        }

        setIsOpen((currentValue) => {
            const nextValue = !currentValue;

            if (Platform.OS === 'web' && nextValue && !isInDialog) {
                requestAnimationFrame(() => {
                    updateWebMenuPosition();
                });
            }

            return nextValue;
        });
    }, [disabled, isInDialog, updateWebMenuPosition]);

    useEffect(() => {
        if (!disabled) {
            return;
        }

        closeDropdown();
    }, [closeDropdown, disabled]);

    useEffect(() => {
        if (Platform.OS !== 'web' || !isOpen || isInDialog) {
            return;
        }

        const handleScrollOrResize = () => {
            updateWebMenuPosition();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeDropdown();
            }
        };

        updateWebMenuPosition();

        window.addEventListener('resize', handleScrollOrResize);
        window.addEventListener('scroll', handleScrollOrResize, true);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('resize', handleScrollOrResize);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [closeDropdown, isInDialog, isOpen, updateWebMenuPosition]);

    const dropdownList = options.length || allowUnselect ? (
        <Column className='gap-1 w-full'>
            {allowUnselect && (
                <AppDropdownItem
                    className={itemClassName}
                    isSelected={selectedValue === ''}
                    label={unselectLabel}
                    onSelect={() => handleValueChange('')}
                    selectedClassName={selectedItemClassName}
                />
            )}
            {options.map((option) => (
                <AppDropdownItem
                    key={option.value}
                    className={itemClassName}
                    isSelected={option.value === selectedValue}
                    label={option.label}
                    onSelect={() => handleValueChange(option.value)}
                    selectedClassName={selectedItemClassName}
                />
            ))}
        </Column>
    ) : (
        <AppDropdownEmptyState className={emptyStateClassName} text={emptyText} />
    );

    const dialogDropdownList = options.length || allowUnselect ? (
        <Column className='gap-1 w-full'>
            {allowUnselect && (
                <AppDropdownItem
                    className={itemClassName}
                    isSelected={selectedValue === ''}
                    label={unselectLabel}
                    onSelect={() => handleValueChange('')}
                    selectedClassName={selectedItemClassName || 'bg-accent'}
                />
            )}
            {options.map((option) => (
                <AppDropdownItem
                    key={option.value}
                    className={itemClassName}
                    isSelected={option.value === selectedValue}
                    label={option.label}
                    onSelect={() => handleValueChange(option.value)}
                    selectedClassName={selectedItemClassName || 'bg-accent'}
                />
            ))}
        </Column>
    ) : (
        <AppDropdownEmptyState className={emptyStateClassName} text={emptyText} />
    );

    if (Platform.OS === 'web') {
        if (isInDialog) {
            return (
                <>
                    <AppDropdownTrigger
                        ref={triggerRef}
                        className={`${triggerClassName} ${disabled ? 'opacity-60' : ''}`.trim()}
                        isOpen={isOpen}
                        isPlaceholder={!selectedOption}
                        label={selectedOption?.label ?? placeholder}
                        onPress={handleTriggerPress}
                        disabled={disabled}
                    />

                    <Dialog isOpen={isOpen} onOpenChange={setIsOpen}>
                        <Dialog.Portal>
                            <Dialog.Overlay className='bg-black/20' />
                            <Dialog.Content className='mx-auto w-[min(90vw,22rem)] max-w-sm rounded border-2 border-border bg-background p-1'>
                                {React.createElement(
                                    'div',
                                    {
                                        id: menuId,
                                        role: 'listbox',
                                        className: `max-h-[60vh] w-full overflow-y-auto rounded ${contentClassName}`.trim(),
                                    },
                                    dialogDropdownList,
                                )}
                            </Dialog.Content>
                        </Dialog.Portal>
                    </Dialog>
                </>
            );
        }

        // Original web implementation (exact)
        return (
            <>
                <AppDropdownTrigger
                    ref={triggerRef}
                    className={`${triggerClassName} ${disabled ? 'opacity-60' : ''}`.trim()}
                    isOpen={isOpen}
                    isPlaceholder={!selectedOption}
                    label={selectedOption?.label ?? placeholder}
                    onPress={handleTriggerPress}
                    disabled={disabled}
                />

                {isOpen && webMenuPosition ? (
                    <WebDropdownPortal>
                        <>
                            {React.createElement('div', {
                                'aria-hidden': true,
                                onClick: (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
                                    event.preventDefault?.();
                                    event.stopPropagation?.();
                                    closeDropdown();
                                },
                                onMouseDown: (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
                                    event.preventDefault?.();
                                    event.stopPropagation?.();
                                },
                                style: {
                                    inset: 0,
                                    pointerEvents: 'auto',
                                    position: 'fixed',
                                },
                            })}

                            <AppDropdownMenu
                                id={menuId}
                                className={contentClassName}
                                onClick={(event) => {
                                    event.preventDefault?.();
                                    event.stopPropagation?.();
                                }}
                                onMouseDown={(event) => {
                                    event.preventDefault?.();
                                    event.stopPropagation?.();
                                }}
                                style={{
                                    ...(webMenuPosition.bottom !== undefined
                                        ? { bottom: webMenuPosition.bottom }
                                        : { top: webMenuPosition.top }),
                                    left: webMenuPosition.left,
                                    maxHeight: webMenuPosition.maxHeight,
                                    overflowY: 'auto',
                                    pointerEvents: 'auto',
                                    position: 'fixed',
                                    width: webMenuPosition.width,
                                }}
                            >
                                {dropdownList}
                            </AppDropdownMenu>
                        </>
                    </WebDropdownPortal>
                ) : null}
            </>
        );
    }

    return (
        <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
            <Popover.Trigger className={`w-full flex-row items-center justify-between rounded border border-subtle-border bg-background px-3 py-3 ${triggerClassName} ${disabled ? 'opacity-60' : ''}`.trim()} isDisabled={disabled}>
                <FontText weight='medium' className={!selectedOption ? 'opacity-60' : ''}>
                    {selectedOption?.label ?? placeholder}
                </FontText>
                <ChevronDown size={18} color='rgb(46, 41, 37)' />
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Overlay
                    className='bg-black/10'
                    isAnimatedStyleActive={true}
                />
                <Popover.Content
                    presentation='popover'
                    width='trigger'
                    placement='bottom'
                    offset={8}
                    animation={undefined}
                    className={`rounded border border-subtle-border bg-background p-1 ${contentClassName}`}
                    style={undefined}
                >
                    {dropdownList}
                </Popover.Content>
            </Popover.Portal>
        </Popover>
    );
};

export default AppDropdown;
