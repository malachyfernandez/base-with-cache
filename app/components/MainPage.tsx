import React, { useState, useCallback } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import Column from './layout/Column';
import Row from './layout/Row';
import FontText from './ui/text/FontText';
import AppButton from './ui/buttons/AppButton';
import { useValue } from 'hooks/useData';
import { useUndoRedo } from 'hooks/useUndoRedo';
import TopSiteBar from './layout/TopSiteBar';

const MainPage: React.FC = () => {
    const [userData] = useValue("userData");
    const userId = userData.value.userId || "";

    const [postsState, setPosts] = useValue<Record<string, { text: string; createdAt: number }>>("posts", {
        defaultValue: {},
    });
    const allPosts = postsState.value || {};
    const postEntries = Object.entries(allPosts).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));

    const [modalVisible, setModalVisible] = useState(false);
    const [newPostText, setNewPostText] = useState("");
    const { executeCommand } = useUndoRedo();

    const handleCreatePost = useCallback(() => {
        if (!newPostText.trim()) return;
        const postId = `post_${Date.now()}`;
        const nextPosts = {
            ...allPosts,
            [postId]: { text: newPostText.trim(), createdAt: Date.now() },
        };
        const prevPosts = { ...allPosts };

        executeCommand({
            description: "Create post",
            action: () => setPosts(nextPosts),
            undoAction: () => setPosts(prevPosts),
        });

        setNewPostText("");
        setModalVisible(false);
    }, [newPostText, allPosts, executeCommand, setPosts]);

    const handleCancel = useCallback(() => {
        setNewPostText("");
        setModalVisible(false);
    }, []);

    return (
        <View className='w-screen h-screen p-safe'>
            <Column className='flex-1 p-4 gap-4'>
                <FontText className='text-lg font-bold' color="text">User: {userId || "Unknown"}</FontText>

                <AppButton variant="filled" className="self-start" onPress={() => setModalVisible(true)}>
                    <FontText color="white">Create Post</FontText>
                </AppButton>

                <Column className='gap-2 flex-1'>
                    {postEntries.length === 0 && (
                        <FontText color="muted-text">No posts yet.</FontText>
                    )}
                    {postEntries.map(([postId, post]) => (
                        <View key={postId} className='bg-background border border-border rounded p-3'>
                            <FontText className='text-sm' color="text">{post.text}</FontText>
                        </View>
                    ))}
                </Column>
            </Column>

            <View className='absolute top-0 right-0'>
                <TopSiteBar />
            </View>

            {modalVisible && (
                <Pressable
                    className='absolute inset-0 bg-black/50 items-center justify-center z-50'
                    onPress={handleCancel}
                >
                    <Pressable
                        className='bg-background border border-border rounded-xl p-6 w-[90vw] max-w-md gap-4'
                        onPress={(e: any) => e.stopPropagation()}
                    >
                        <FontText className='text-lg font-bold' color="text">New Post</FontText>
                        <TextInput
                            className='border border-border rounded p-3 text-text bg-background min-h-[80px]'
                            value={newPostText}
                            onChangeText={setNewPostText}
                            placeholder="Write something..."
                            placeholderTextColor="#888"
                            multiline
                            autoFocus
                        />
                        <Row className='gap-2 justify-end'>
                            <AppButton variant="outline" onPress={handleCancel}>
                                <FontText color="text">Cancel</FontText>
                            </AppButton>
                            <AppButton variant="filled" onPress={handleCreatePost}>
                                <FontText color="white">Submit</FontText>
                            </AppButton>
                        </Row>
                    </Pressable>
                </Pressable>
            )}
        </View>
    );
};

export default MainPage;
